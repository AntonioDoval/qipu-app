-- ═══════════════════════════════════════════════════════════════════════════════
-- Qipu — Migration 002
-- 1. Notes become an item type ('note'), Obsidian-style: free text, linked,
--    tagged. A note can optionally be anchored to a spot in another item
--    (a comment on a PDF page / passage) and still live on its own.
-- 2. Links between items are simple and untyped (drop link_type).
-- 3. Project depth (max 20) is enforced by a trigger; cycles are rejected.
-- 4. Search is language-neutral and accent-insensitive (ES + EN), and also
--    covers inline text (notes, fieldnotes).
-- 5. Quotes store their on-page position so they can be highlighted.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Notes as items ────────────────────────────────────────────────────────
alter table public.items drop constraint items_type_check;
alter table public.items add constraint items_type_check check (type in (
  'book','book_chapter','journal_article','thesis','working_paper',
  'conference_paper','interview','fieldnote','document','note','webpage',
  'image','video','audio','social_media_post','dataset','statistic','custom'
));

-- Anchor: the item this note comments on (null = free-standing note).
-- The exact spot (page, selected text, rectangles) lives in metadata->'anchor'.
alter table public.items
  add column anchor_item_id uuid references public.items(id) on delete set null;

alter table public.items add constraint items_anchor_not_self
  check (anchor_item_id is null or anchor_item_id <> id);

create index items_anchor_item_id_idx on public.items(anchor_item_id)
  where anchor_item_id is not null;

-- ─── 2. Simple links ──────────────────────────────────────────────────────────
alter table public.item_links drop column link_type;
alter table public.item_links add constraint item_links_not_self
  check (from_item_id <> to_item_id);

-- ─── 3. Project depth ─────────────────────────────────────────────────────────
-- Depth is derived, so it is no longer stored.
alter table public.projects drop column depth;

create or replace function public.projects_check_tree()
returns trigger language plpgsql as $$
declare
  ancestor uuid := new.parent_id;
  depth    integer := 0;
  height   integer;
begin
  -- Walk up from the new parent: count levels and detect cycles.
  while ancestor is not null loop
    if ancestor = new.id then
      raise exception 'A project cannot be inside itself';
    end if;
    depth := depth + 1;
    select parent_id into ancestor from public.projects where id = ancestor;
  end loop;

  -- How deep the subtree under this project goes (0 if it has no children).
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
end;
$$;

create trigger projects_check_tree
  before insert or update of parent_id on public.projects
  for each row execute procedure public.projects_check_tree();

-- ─── 4. Search: language-neutral, accent-insensitive ──────────────────────────
-- unaccent() is not immutable by default; wrap it so it can be used freely.
create or replace function public.qipu_unaccent(text)
returns text language sql immutable parallel safe strict
set search_path = public, extensions
as $$ select unaccent('unaccent', $1) $$;

create or replace function public.items_search_vector_update()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', public.qipu_unaccent(coalesce(new.title, ''))), 'A') ||
    setweight(to_tsvector('simple', public.qipu_unaccent(coalesce(array_to_string(new.creators, ' '), ''))), 'B') ||
    setweight(to_tsvector('simple', public.qipu_unaccent(coalesce(new.inline_content, ''))), 'C') ||
    setweight(to_tsvector('simple', public.qipu_unaccent(coalesce(new.content_text, ''))), 'D');
  return new;
end;
$$;

-- Recompute the vector for rows that already exist.
update public.items set title = title;

-- ─── 5. Quote position ────────────────────────────────────────────────────────
-- e.g. {"page": 12, "rects": [[x, y, w, h], ...]} — used to draw highlights.
alter table public.quotes add column position jsonb;
