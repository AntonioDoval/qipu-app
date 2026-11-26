-- ═══════════════════════════════════════════════════════════════════════════════
-- Qipu — Migration 002: core model
--
-- Implements docs/ui-spec.md §10 "Foundations" (and tag inheritance, §6). It REPLACES the library tables
-- created by 001 (items, tags, projects, quotes, links and their join tables),
-- which hold no data yet. It keeps: profiles, handle_new_user(), set_updated_at().
--
-- Summary
--   • items: one table for Bibliography, Sources and Notes (column `kind`).
--     References are stored as CSL-JSON (`csl`), the format citation styles use.
--     Year, date precision and author text are derived from `csl` by a trigger.
--   • citekeys (surnameyear, then b, c…) generated automatically, stable after.
--   • notes: Markdown in `body`; version history kept in note_versions.
--   • tags stored as full paths ("andes/ayni"); projects nest up to 20 levels.
--   • links between items, untyped; origin says whether a note's text created them.
--   • annotations (highlight, square, circle, star, ink) with two anchors:
--     position in PDF coordinates and the quoted text with its context.
--   • highlights inherit their item's tags (view annotation_tags_effective).
--   • PDF text stored per page (item_pages) for full-text search with page numbers.
--   • search: language-neutral and accent-insensitive (config `qipu`).
--   • row-level security on every table; join tables check BOTH sides.
--   • private.google_credentials: Google refresh tokens, never reachable from the browser.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 0. Remove the 001 library tables (empty) ────────────────────────────────
drop table if exists
  public.quote_tags, public.quotes, public.item_links, public.item_projects,
  public.projects, public.item_tags, public.tags, public.items
  cascade;
drop function if exists public.items_search_vector_update() cascade;


-- ─── 1. Text search and folding (accent-insensitive, any language) ───────────
do $$
declare
  ext_schema text;
begin
  select n.nspname into ext_schema
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'unaccent';
  if ext_schema is null then
    raise exception 'The unaccent extension is required (created in migration 001)';
  end if;

  if not exists (select 1 from pg_ts_config c join pg_namespace n on n.oid = c.cfgnamespace
                 where c.cfgname = 'qipu' and n.nspname = 'public') then
    create text search configuration public.qipu (copy = pg_catalog.simple);
  end if;
  -- unaccent strips accents, then simple lower-cases. No stemming: works for ES and EN alike.
  execute format(
    'alter text search configuration public.qipu
       alter mapping for word, hword, hword_part, asciiword, asciihword, hword_asciipart
       with %I.unaccent, simple', ext_schema);
end $$;

-- Lower-case, accent-free version of a string (for sort keys and citekeys).
create or replace function public.qipu_fold(t text)
returns text language sql immutable parallel safe strict
set search_path = public, extensions, pg_catalog
as $$ select lower(unaccent('unaccent'::regdictionary, t)) $$;


-- ─── 2. Profiles: highlight palette and custom source types ──────────────────
-- Default palette: Okabe–Ito colors, distinguishable with common colorblindness.
alter table public.profiles
  add column palette jsonb not null default
    '[{"color":"#F0E442","name":null},{"color":"#009E73","name":null},{"color":"#CC79A7","name":null},{"color":"#56B4E9","name":null},{"color":"#E69F00","name":null}]'::jsonb
    check (jsonb_typeof(palette) = 'array' and jsonb_array_length(palette) = 5),
  add column source_types text[] not null default '{}';   -- the user's own types; built-in ones live in code

comment on column public.profiles.palette is
  'Five highlight colors (keys 1–5): {color: "#RRGGBB", name: text|null}. Annotations store the slot, not the hex.';


-- ─── 3. (Ownership helpers for row-level security are in section 12.) ────────


-- ─── 4. Projects ─────────────────────────────────────────────────────────────
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  parent_id   uuid references public.projects(id) on delete set null,
  name        text not null check (char_length(btrim(name)) between 1 and 200),
  description text check (char_length(description) <= 5000),
  color       text not null default '#a89b85' check (color ~ '^#[0-9a-fA-F]{6}$'),
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index projects_user_idx   on public.projects(user_id);
create index projects_parent_idx on public.projects(parent_id);
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- Max depth 20, no cycles, parent must belong to the same user.
create or replace function public.projects_check_tree()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  ancestor uuid := new.parent_id;
  depth    integer := 0;
  height   integer;
  owner    uuid;
begin
  if new.parent_id is not null then
    select user_id into owner from public.projects where id = new.parent_id;
    if owner is distinct from new.user_id then
      raise exception 'The parent project does not exist or belongs to someone else';
    end if;
  end if;
  while ancestor is not null loop
    if ancestor = new.id then
      raise exception 'A project cannot be inside itself';
    end if;
    depth := depth + 1;
    select parent_id into ancestor from public.projects where id = ancestor;
  end loop;
  with recursive sub as (
    select id, 0 as lvl from public.projects where id = new.id
    union all
    select p.id, sub.lvl + 1 from public.projects p join sub on p.parent_id = sub.id
  )
  select coalesce(max(lvl), 0) into height from sub;
  if depth + height > 20 then
    raise exception 'Projects can be nested at most 20 levels deep';
  end if;
  return new;
end $$;
create trigger projects_check_tree before insert or update of parent_id on public.projects
  for each row execute function public.projects_check_tree();


-- ─── 5. Tags (full paths: "andes/ayni") ──────────────────────────────────────
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  path       text not null check (char_length(path) <= 200 and path ~ '^[^\s/#]+(/[^\s/#]+)*$'),
  color      text check (color ~ '^#[0-9a-fA-F]{6}$'),   -- null = inherit from parent, else default
  created_at timestamptz not null default now()
);
create unique index tags_user_path_uq on public.tags(user_id, lower(path));


-- ─── 6. Items: Bibliography, Sources, Notes ──────────────────────────────────
create table public.items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,

  kind            text not null check (kind in ('bibliography', 'source', 'note')),
  -- bibliography: a CSL type; source: a built-in key (interview, document, archival,
  -- webpage, image) or the user's own label; note: 'note'
  type            text not null check (char_length(type) between 1 and 60),
  title           text not null check (char_length(btrim(title)) between 1 and 1000),
  citekey         text check (citekey ~ '^[a-z0-9][a-z0-9_:.-]{0,79}$'),

  -- CSL-JSON for bibliography and sources: author/editor/interviewer as {family, given}
  -- or {literal}, issued {"date-parts": [[y, m, d]]}, container-title, publisher, DOI…
  -- Title and type live in their own columns above.
  csl             jsonb not null default '{}'::jsonb check (jsonb_typeof(csl) = 'object'),
  metadata        jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),

  -- notes: Markdown. Pasted-text sources: the text (read-only in the app).
  body            text check (char_length(body) <= 500000),

  -- where the content lives
  content_source  text not null default 'none' check (content_source in ('none', 'drive_pdf', 'pasted')),
  drive_file_id   text,
  file_name       text,
  file_size       bigint check (file_size >= 0),
  file_sha256     text check (file_sha256 ~ '^[0-9a-f]{64}$'),   -- spots duplicate uploads
  page_count      integer check (page_count >= 1),
  has_text_layer  boolean,                                       -- false = scanned PDF

  -- notes only: the text this note comments on (highlights: see note_annotations)
  anchor_item_id  uuid references public.items(id) on delete set null,

  -- derived from csl by items_derive(); do not write directly
  year            integer check (year between -3000 and 3000),
  date_value      date,
  date_precision  text check (date_precision in ('year', 'month', 'day')),
  creators_text   text not null default '',
  sort_creator    text not null default '',

  revision        integer not null default 1,   -- +1 on every save; detects two tabs editing at once
  deleted_at      timestamptz,                  -- trash (kept 30 days)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  search_vector   tsvector generated always as (
    setweight(to_tsvector('public.qipu', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('public.qipu', coalesce(citekey, '') || ' ' || creators_text), 'B') ||
    setweight(to_tsvector('public.qipu', coalesce(body, '')), 'C')
  ) stored,

  constraint items_bibliography_type check (kind <> 'bibliography' or type in (
    'article', 'article-journal', 'article-magazine', 'article-newspaper', 'bill', 'book',
    'broadcast', 'chapter', 'classic', 'collection', 'dataset', 'document', 'entry',
    'entry-dictionary', 'entry-encyclopedia', 'event', 'figure', 'graphic', 'hearing',
    'interview', 'legal_case', 'legislation', 'manuscript', 'map', 'motion_picture',
    'musical_score', 'pamphlet', 'paper-conference', 'patent', 'performance', 'periodical',
    'personal_communication', 'post', 'post-weblog', 'regulation', 'report', 'review',
    'review-book', 'software', 'song', 'speech', 'standard', 'thesis', 'treaty', 'webpage')),
  constraint items_note_shape check (kind <> 'note'
    or (type = 'note' and csl = '{}'::jsonb and content_source = 'none')),
  constraint items_citekey_bibliography check (citekey is null or kind = 'bibliography'),
  constraint items_anchor_notes_only check (anchor_item_id is null or kind = 'note'),
  constraint items_anchor_not_self check (anchor_item_id is null or anchor_item_id <> id),
  constraint items_drive_pdf_has_file check (content_source <> 'drive_pdf' or drive_file_id is not null),
  constraint items_pasted_is_source check (content_source <> 'pasted' or (kind = 'source' and body is not null))
);

create index items_user_kind_idx   on public.items(user_id, kind) where deleted_at is null;
create index items_user_created_idx on public.items(user_id, created_at desc);
create index items_anchor_idx      on public.items(anchor_item_id) where anchor_item_id is not null;
create index items_search_idx      on public.items using gin(search_vector);
create unique index items_citekey_uq on public.items(user_id, citekey) where citekey is not null;
create unique index items_drive_file_uq on public.items(user_id, drive_file_id) where drive_file_id is not null;

-- Next free citekey for this user: base, then base+b, base+c … (base+a is never used).
-- Runs with the caller's rights, so it only sees that user's items.
-- VOLATILE on purpose: it must see rows added earlier in the same multi-row insert
-- (e.g. a BibTeX import), or two items could get the same key.
create or replace function public.next_citekey(base text)
returns text language plpgsql volatile set search_path = ''
as $$
declare
  k text;
  n integer := 0;
begin
  loop
    k := base || case
      when n = 0  then ''
      when n < 26 then chr(97 + n)
      else chr(96 + n / 26) || chr(97 + n % 26)
    end;
    exit when not exists (select 1 from public.items where citekey = k);
    n := n + 1;
  end loop;
  return k;
end $$;

-- Derive year/date/creators from csl, and give new bibliography items a citekey.
create or replace function public.items_derive()
returns trigger language plpgsql set search_path = ''
as $$
declare
  dp    jsonb;
  y     integer;
  m     integer;
  d     integer;
  first text;
  base  text;
begin
  -- dates: csl.issued.date-parts[0] = [year, month?, day?]
  new.year := null; new.date_value := null; new.date_precision := null;
  dp := new.csl #> '{issued,date-parts,0}';
  if jsonb_typeof(dp) = 'array' and coalesce(dp ->> 0, '') ~ '^-?[0-9]{1,4}$' then
    y := (dp ->> 0)::integer;
    new.year := y;
    m := case when coalesce(dp ->> 1, '') ~ '^[0-9]{1,2}$' and (dp ->> 1)::integer between 1 and 12
              then (dp ->> 1)::integer end;
    d := case when m is not null and coalesce(dp ->> 2, '') ~ '^[0-9]{1,2}$' then (dp ->> 2)::integer end;
    begin
      new.date_value := make_date(y, coalesce(m, 1), coalesce(d, 1));
      new.date_precision := case when d is not null then 'day' when m is not null then 'month' else 'year' end;
    exception when others then
      new.date_value := null; new.date_precision := 'year';
    end;
  end if;

  -- people: authors, then editors, then interviewers
  with people as (
    select r.role_ord, a.ord, a.p
    from (values ('author', 1), ('editor', 2), ('interviewer', 3)) as r(role, role_ord)
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(new.csl -> r.role) = 'array' then new.csl -> r.role else '[]'::jsonb end
    ) with ordinality as a(p, ord)
    where jsonb_typeof(a.p) = 'object'
  )
  select
    coalesce(string_agg(btrim(concat_ws(' ', p ->> 'given', p ->> 'family', p ->> 'literal')), '; '
                        order by role_ord, ord), ''),
    (array_agg(coalesce(p ->> 'family', p ->> 'literal') order by role_ord, ord))[1]
  into new.creators_text, first
  from people;
  new.creators_text := coalesce(new.creators_text, '');
  new.sort_creator := coalesce(public.qipu_fold(first), '');

  -- citekey: surname + year (or "nd"), lower case, letters and digits only; stable once set
  if tg_op = 'INSERT' and new.kind = 'bibliography' and new.citekey is null then
    base := regexp_replace(public.qipu_fold(coalesce(first, split_part(new.title, ' ', 1))), '[^a-z0-9]', '', 'g');
    if base = '' then base := 'ref'; end if;
    base := left(base, 40) || coalesce(new.year::text, 'nd');
    new.citekey := public.next_citekey(base);
  end if;
  return new;
end $$;
create trigger items_derive before insert or update on public.items
  for each row execute function public.items_derive();

-- Every save: new modified time and revision number.
create or replace function public.items_touch()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.revision := old.revision + 1;
  return new;
end $$;
create trigger items_touch before update on public.items
  for each row execute function public.items_touch();


-- ─── 7. Note version history ─────────────────────────────────────────────────
create table public.note_versions (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.items(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null,
  body       text,
  saved_at   timestamptz not null,               -- when this version was the current text
  created_at timestamptz not null default now()
);
create index note_versions_note_idx on public.note_versions(note_id, created_at desc);

-- Before a note changes, keep the previous text — at most one snapshot per 10 minutes,
-- so autosave does not flood the history.
create or replace function public.items_keep_version()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.kind = 'note'
     and (old.body is distinct from new.body or old.title is distinct from new.title)
     and not exists (select 1 from public.note_versions v
                     where v.note_id = old.id and v.created_at > now() - interval '10 minutes') then
    insert into public.note_versions (note_id, user_id, title, body, saved_at)
    values (old.id, old.user_id, old.title, old.body, old.updated_at);
  end if;
  return null;
end $$;
create trigger items_keep_version after update on public.items
  for each row execute function public.items_keep_version();


-- ─── 8. PDF text, one row per page ───────────────────────────────────────────
create table public.item_pages (
  item_id       uuid not null references public.items(id) on delete cascade,
  page          integer not null check (page >= 1),
  text          text not null default '' check (char_length(text) <= 200000),
  search_vector tsvector generated always as (to_tsvector('public.qipu', text)) stored,
  primary key (item_id, page)
);
create index item_pages_search_idx on public.item_pages using gin(search_vector);


-- ─── 9. Annotations (replace "quotes") ───────────────────────────────────────
create table public.annotations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id    uuid not null references public.items(id) on delete cascade,
  kind       text not null check (kind in ('highlight', 'square', 'circle', 'star', 'ink')),
  color      smallint not null check (color between 1 and 5),      -- palette slot
  page       integer check (page >= 1),                            -- null for pasted text
  -- Anchor 1, position in PDF user space (points):
  --   highlight {"rects": [[x1,y1,x2,y2], …]} · shapes {"box": [x1,y1,x2,y2]} · ink {"paths": [[[x,y], …], …]}
  position   jsonb check (position is null or jsonb_typeof(position) = 'object'),
  -- Anchor 2, the text (W3C TextQuoteSelector + offsets):
  --   {"exact": "…", "prefix": "…", "suffix": "…", "start": n, "end": n}
  quote      jsonb check (quote is null or jsonb_typeof(quote) = 'object'),
  text       text check (char_length(text) <= 20000),             -- highlighted text, for lists and search
  locator    text check (char_length(locator) <= 100),            -- "p. 81", editable
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint annotations_highlight_has_text check (kind <> 'highlight'
    or (coalesce(quote ? 'exact', false) and text is not null)),
  constraint annotations_drawings_on_pdf_pages check (kind = 'highlight'
    or (page is not null and position is not null))
);
create index annotations_item_idx on public.annotations(item_id) where deleted_at is null;
create trigger annotations_updated_at before update on public.annotations
  for each row execute function public.set_updated_at();


-- ─── 10. Join tables ─────────────────────────────────────────────────────────
create table public.item_tags (
  item_id uuid not null references public.items(id) on delete cascade,
  tag_id  uuid not null references public.tags(id)  on delete cascade,
  primary key (item_id, tag_id)
);
create index item_tags_tag_idx on public.item_tags(tag_id);

create table public.annotation_tags (
  annotation_id uuid not null references public.annotations(id) on delete cascade,
  tag_id        uuid not null references public.tags(id)        on delete cascade,
  primary key (annotation_id, tag_id)
);
create index annotation_tags_tag_idx on public.annotation_tags(tag_id);

create table public.item_projects (
  item_id    uuid not null references public.items(id)    on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  primary key (item_id, project_id)
);
create index item_projects_project_idx on public.item_projects(project_id);

-- Untyped links. origin = 'text' when a note's [[link]] created it (kept in sync by the app),
-- 'manual' when added by hand. Shown in both directions (links and backlinks).
create table public.item_links (
  from_item_id uuid not null references public.items(id) on delete cascade,
  to_item_id   uuid not null references public.items(id) on delete cascade,
  origin       text not null default 'manual' check (origin in ('manual', 'text')),
  created_at   timestamptz not null default now(),
  primary key (from_item_id, to_item_id, origin),
  check (from_item_id <> to_item_id)
);
create index item_links_to_idx on public.item_links(to_item_id);

-- A note attached to one or more highlights.
create table public.note_annotations (
  note_id       uuid not null references public.items(id)       on delete cascade,
  annotation_id uuid not null references public.annotations(id) on delete cascade,
  primary key (note_id, annotation_id)
);
create index note_annotations_annotation_idx on public.note_annotations(annotation_id);

-- "Recently opened" (kept apart so opening an item does not change its Modified date).
create table public.item_activity (
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id   uuid not null references public.items(id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index item_activity_recent_idx on public.item_activity(user_id, opened_at desc);


-- ─── 11. Google credentials (server only) ────────────────────────────────────
-- The `private` schema is not exposed to the browser API. Only server code using the
-- service role reads it. Tokens are encrypted by the server before they are stored.
create schema if not exists private;
revoke all on schema private from public;
create table private.google_credentials (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  refresh_token_encrypted text not null,
  scopes                  text not null,
  updated_at              timestamptz not null default now()
);


-- ─── 12. Row-level security ──────────────────────────────────────────────────
create or replace function public.owns_item(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.items where id = target and user_id = auth.uid()) $$;

create or replace function public.owns_tag(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.tags where id = target and user_id = auth.uid()) $$;

create or replace function public.owns_project(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.projects where id = target and user_id = auth.uid()) $$;

create or replace function public.owns_annotation(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.annotations where id = target and user_id = auth.uid()) $$;

alter table public.projects         enable row level security;
alter table public.tags             enable row level security;
alter table public.items            enable row level security;
alter table public.note_versions    enable row level security;
alter table public.item_pages       enable row level security;
alter table public.annotations      enable row level security;
alter table public.item_tags        enable row level security;
alter table public.annotation_tags  enable row level security;
alter table public.item_projects    enable row level security;
alter table public.item_links       enable row level security;
alter table public.note_annotations enable row level security;
alter table public.item_activity    enable row level security;
alter table private.google_credentials enable row level security;   -- no policies: browser roles get nothing

create policy "own projects" on public.projects for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own tags" on public.tags for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own items" on public.items for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (anchor_item_id is null or public.owns_item(anchor_item_id)));

create policy "own note versions" on public.note_versions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.owns_item(note_id));

create policy "own item pages" on public.item_pages for all to authenticated
  using (public.owns_item(item_id)) with check (public.owns_item(item_id));

create policy "own annotations" on public.annotations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.owns_item(item_id));

create policy "own item tags" on public.item_tags for all to authenticated
  using (public.owns_item(item_id) and public.owns_tag(tag_id))
  with check (public.owns_item(item_id) and public.owns_tag(tag_id));

create policy "own annotation tags" on public.annotation_tags for all to authenticated
  using (public.owns_annotation(annotation_id) and public.owns_tag(tag_id))
  with check (public.owns_annotation(annotation_id) and public.owns_tag(tag_id));

create policy "own item projects" on public.item_projects for all to authenticated
  using (public.owns_item(item_id) and public.owns_project(project_id))
  with check (public.owns_item(item_id) and public.owns_project(project_id));

create policy "own item links" on public.item_links for all to authenticated
  using (public.owns_item(from_item_id) and public.owns_item(to_item_id))
  with check (public.owns_item(from_item_id) and public.owns_item(to_item_id));

create policy "own note annotations" on public.note_annotations for all to authenticated
  using (public.owns_item(note_id) and public.owns_annotation(annotation_id))
  with check (public.owns_item(note_id) and public.owns_annotation(annotation_id));

create policy "own item activity" on public.item_activity for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.owns_item(item_id));


-- ─── 12b. Tag inheritance: a highlight carries its item's tags ───────────────
-- Own tags (inherited = false) plus the item's tags it does not already have
-- (inherited = true). Runs with the caller's rights, so row-level security applies.
create view public.annotation_tags_effective with (security_invoker = true) as
  select at.annotation_id, at.tag_id, false as inherited
  from public.annotation_tags at
  union all
  select a.id, it.tag_id, true
  from public.annotations a
  join public.item_tags it on it.item_id = a.item_id
  where not exists (select 1 from public.annotation_tags x
                    where x.annotation_id = a.id and x.tag_id = it.tag_id);


-- ─── 13. Full-text search (titles, authors, notes, pasted text, PDF pages) ───
-- Matches are marked with ⟦ ⟧ in the snippet; the app turns them into highlights.
-- Runs with the caller's rights, so row-level security applies.
create or replace function public.search_library(q text)
returns table (item_id uuid, page integer, rank real, snippet text)
language sql stable set search_path = ''
as $$
  with query as (select websearch_to_tsquery('public.qipu', q) as tsq)
  select i.id as item_id, null::integer as page, ts_rank(i.search_vector, query.tsq) as rank,
         ts_headline('public.qipu', coalesce(i.body, i.title), query.tsq,
                     'MaxFragments=1, MaxWords=30, MinWords=10, StartSel=⟦, StopSel=⟧') as snippet
  from public.items i, query
  where i.deleted_at is null and i.search_vector @@ query.tsq
  union all
  select p.item_id, p.page, ts_rank(p.search_vector, query.tsq),
         ts_headline('public.qipu', p.text, query.tsq,
                     'MaxFragments=1, MaxWords=30, MinWords=10, StartSel=⟦, StopSel=⟧')
  from public.item_pages p join public.items i on i.id = p.item_id, query
  where i.deleted_at is null and p.search_vector @@ query.tsq
  order by rank desc
  limit 200
$$;


-- ─── 14. Trash: permanently remove things deleted more than 30 days ago ──────
-- Never touches Google Drive. Meant for a scheduled job, not for the browser.
create or replace function public.purge_trash()
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.annotations where deleted_at < now() - interval '30 days';
  delete from public.items where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.purge_trash() from public, anon, authenticated;
