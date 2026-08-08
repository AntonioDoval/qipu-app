-- ═══════════════════════════════════════════════════════════════════════════════
-- Qipu — Initial Schema
-- Migration: 001_initial_schema
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable required extensions
create extension if not exists "pg_trgm";        -- trigram index for LIKE search
create extension if not exists "unaccent";        -- accent-insensitive search

-- ─── User profiles ────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-level profile data
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null,
  full_name        text,
  avatar_url       text,
  drive_connected  boolean not null default false,
  locale           text not null default 'es' check (locale in ('es', 'en')),
  created_at       timestamptz not null default now()
);

-- Auto-create profile on first login
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Items ────────────────────────────────────────────────────────────────────
create table public.items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,

  -- Core fields
  type             text not null check (type in (
                     'book','book_chapter','journal_article','thesis','working_paper',
                     'conference_paper','interview','fieldnote','document','webpage',
                     'image','video','audio','social_media_post','dataset','statistic','custom'
                   )),
  title            text not null check (char_length(title) > 0),
  content_source   text not null default 'none' check (content_source in (
                     'drive_file','url','inline_text','none'
                   )),

  -- Content
  drive_file_id    text,
  external_url     text,
  inline_content   text check (char_length(inline_content) <= 500000),  -- ~500k chars max
  content_text     text,   -- extracted text from PDFs for full-text search

  -- Extracted columns for efficient sorting/filtering
  year             integer check (year > 1000 and year < 2200),
  creators         text[],

  -- All other type-specific metadata
  metadata         jsonb not null default '{}',

  -- Soft delete
  deleted_at       timestamptz,

  -- Timestamps
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Full-text search vector (title + creators + content_text)
-- Populated via trigger (generated columns don't support language-specific tsvector)
alter table public.items add column search_vector tsvector;

create or replace function public.items_search_vector_update()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('spanish', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(array_to_string(new.creators, ' '), '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(new.content_text, '')), 'C');
  return new;
end;
$$;

create trigger items_search_vector_trigger
  before insert or update on public.items
  for each row execute procedure public.items_search_vector_update();

-- Indexes
create index items_user_id_idx        on public.items(user_id);
create index items_type_idx           on public.items(type);
create index items_year_idx           on public.items(year);
create index items_deleted_at_idx     on public.items(deleted_at);
create index items_search_vector_idx  on public.items using gin(search_vector);
create index items_metadata_idx       on public.items using gin(metadata);
create index items_creators_idx       on public.items using gin(creators);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_updated_at
  before update on public.items
  for each row execute procedure public.set_updated_at();

-- ─── Tags ─────────────────────────────────────────────────────────────────────
create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) > 0 and char_length(name) <= 100),
  color       text not null default '#a89b85',  -- stone — default gray
  parent_id   uuid references public.tags(id) on delete set null,
  created_at  timestamptz not null default now(),

  unique (user_id, name)
);

create index tags_user_id_idx   on public.tags(user_id);
create index tags_parent_id_idx on public.tags(parent_id);

-- ─── Item ↔ Tag (many-to-many) ────────────────────────────────────────────────
create table public.item_tags (
  item_id  uuid not null references public.items(id) on delete cascade,
  tag_id   uuid not null references public.tags(id)  on delete cascade,
  primary key (item_id, tag_id)
);

create index item_tags_tag_id_idx on public.item_tags(tag_id);

-- ─── Projects ─────────────────────────────────────────────────────────────────
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) > 0 and char_length(name) <= 200),
  color       text not null default '#a89b85',
  description text,
  parent_id   uuid references public.projects(id) on delete set null,
  archived    boolean not null default false,
  depth       integer not null default 0 check (depth >= 0 and depth <= 20),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index projects_user_id_idx   on public.projects(user_id);
create index projects_parent_id_idx on public.projects(parent_id);

create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

-- ─── Item ↔ Project (many-to-many) ───────────────────────────────────────────
create table public.item_projects (
  item_id     uuid not null references public.items(id)    on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  primary key (item_id, project_id)
);

create index item_projects_project_id_idx on public.item_projects(project_id);

-- ─── Quotes ───────────────────────────────────────────────────────────────────
create table public.quotes (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references public.items(id) on delete cascade,
  user_id        uuid not null references auth.users(id)   on delete cascade,
  original_text  text not null check (char_length(original_text) > 0),
  edited_text    text,
  locator        text,   -- e.g. "p. 42", "00:12:34", "párr. 7" — auto-filled or manual
  context_note   text,
  created_at     timestamptz not null default now()
);

create index quotes_item_id_idx on public.quotes(item_id);
create index quotes_user_id_idx on public.quotes(user_id);

-- ─── Quote ↔ Tag (many-to-many) ───────────────────────────────────────────────
create table public.quote_tags (
  quote_id  uuid not null references public.quotes(id) on delete cascade,
  tag_id    uuid not null references public.tags(id)   on delete cascade,
  primary key (quote_id, tag_id)
);

-- ─── Links ────────────────────────────────────────────────────────────────────
create table public.item_links (
  from_item_id  uuid not null references public.items(id) on delete cascade,
  to_item_id    uuid not null references public.items(id) on delete cascade,
  link_type     text not null check (link_type in ('supports','contradicts','extends','see-also')),
  note          text,
  created_at    timestamptz not null default now(),
  primary key (from_item_id, to_item_id)
);

create index item_links_to_idx on public.item_links(to_item_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.profiles      enable row level security;
alter table public.items         enable row level security;
alter table public.tags          enable row level security;
alter table public.item_tags     enable row level security;
alter table public.projects      enable row level security;
alter table public.item_projects enable row level security;
alter table public.quotes        enable row level security;
alter table public.quote_tags    enable row level security;
alter table public.item_links    enable row level security;

-- Profiles
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Items
create policy "Users can view own items"
  on public.items for select using (auth.uid() = user_id);
create policy "Users can insert own items"
  on public.items for insert with check (auth.uid() = user_id);
create policy "Users can update own items"
  on public.items for update using (auth.uid() = user_id);
create policy "Users can delete own items"
  on public.items for delete using (auth.uid() = user_id);

-- Tags
create policy "Users can view own tags"
  on public.tags for select using (auth.uid() = user_id);
create policy "Users can insert own tags"
  on public.tags for insert with check (auth.uid() = user_id);
create policy "Users can update own tags"
  on public.tags for update using (auth.uid() = user_id);
create policy "Users can delete own tags"
  on public.tags for delete using (auth.uid() = user_id);

-- Item tags (access via item ownership)
create policy "Users can view own item_tags"
  on public.item_tags for select
  using (exists (select 1 from public.items where items.id = item_tags.item_id and items.user_id = auth.uid()));
create policy "Users can manage own item_tags"
  on public.item_tags for all
  using (exists (select 1 from public.items where items.id = item_tags.item_id and items.user_id = auth.uid()));

-- Projects
create policy "Users can view own projects"
  on public.projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects"
  on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects"
  on public.projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects"
  on public.projects for delete using (auth.uid() = user_id);

-- Item projects (access via item ownership)
create policy "Users can view own item_projects"
  on public.item_projects for select
  using (exists (select 1 from public.items where items.id = item_projects.item_id and items.user_id = auth.uid()));
create policy "Users can manage own item_projects"
  on public.item_projects for all
  using (exists (select 1 from public.items where items.id = item_projects.item_id and items.user_id = auth.uid()));

-- Quotes
create policy "Users can view own quotes"
  on public.quotes for select using (auth.uid() = user_id);
create policy "Users can insert own quotes"
  on public.quotes for insert with check (auth.uid() = user_id);
create policy "Users can update own quotes"
  on public.quotes for update using (auth.uid() = user_id);
create policy "Users can delete own quotes"
  on public.quotes for delete using (auth.uid() = user_id);

-- Quote tags
create policy "Users can manage own quote_tags"
  on public.quote_tags for all
  using (exists (select 1 from public.quotes where quotes.id = quote_tags.quote_id and quotes.user_id = auth.uid()));

-- Item links
create policy "Users can view own item_links"
  on public.item_links for select
  using (exists (select 1 from public.items where items.id = item_links.from_item_id and items.user_id = auth.uid()));
create policy "Users can manage own item_links"
  on public.item_links for all
  using (exists (select 1 from public.items where items.id = item_links.from_item_id and items.user_id = auth.uid()));
