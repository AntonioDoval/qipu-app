-- ═══════════════════════════════════════════════════════════════════════════════
-- Qipu — Migration 003: explicit permissions
--
-- Current Supabase projects no longer grant new tables to the browser roles
-- automatically, so migration 002's tables answered "permission denied".
-- This grants exactly what the app needs. Row-level security (002) still limits
-- every signed-in user to their own rows.
--
--   authenticated  signed-in users (the app in the browser)
--   anon           visitors who are not signed in: no access to Qipu's data
--   service_role   server code only (e.g. Google tokens, scheduled cleanup)
--
-- Rule for every future migration: grant new tables and functions explicitly here-style.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Tables ──────────────────────────────────────────────────────────────────
grant select, insert, update, delete on
  public.items, public.projects, public.tags, public.annotations,
  public.item_tags, public.annotation_tags, public.item_projects, public.item_links,
  public.note_annotations, public.item_activity, public.item_pages
  to authenticated;

-- Version history is written by a trigger; users read it and may delete it, never rewrite it.
grant select, insert, delete on public.note_versions to authenticated;

-- Profiles are created by the sign-up trigger; users read and update their own.
grant select, update on public.profiles to authenticated;

grant select on public.annotation_tags_effective to authenticated;

grant all on
  public.items, public.projects, public.tags, public.annotations,
  public.item_tags, public.annotation_tags, public.item_projects, public.item_links,
  public.note_annotations, public.item_activity, public.item_pages, public.note_versions,
  public.profiles, public.annotation_tags_effective
  to service_role;

revoke all on
  public.items, public.projects, public.tags, public.annotations,
  public.item_tags, public.annotation_tags, public.item_projects, public.item_links,
  public.note_annotations, public.item_activity, public.item_pages, public.note_versions,
  public.profiles, public.annotation_tags_effective
  from anon;

-- ─── Functions ───────────────────────────────────────────────────────────────
-- Called by the app (search), by row-level security (owns_*), or by triggers running
-- as the signed-in user (folding, citekeys, derived fields, project rules).
grant execute on function
  public.search_library(text),
  public.owns_item(uuid), public.owns_tag(uuid), public.owns_project(uuid), public.owns_annotation(uuid),
  public.qipu_fold(text), public.next_citekey(text),
  public.items_derive(), public.items_touch(), public.items_keep_version(),
  public.projects_check_tree(), public.set_updated_at()
  to authenticated, service_role;

revoke execute on function
  public.search_library(text), public.next_citekey(text)
  from anon;

-- Trash cleanup stays server-only (already revoked from browser roles in 002).
grant execute on function public.purge_trash() to service_role;

-- ─── Server-only schema ──────────────────────────────────────────────────────
grant usage on schema private to service_role;
grant select, insert, update, delete on private.google_credentials to service_role;
