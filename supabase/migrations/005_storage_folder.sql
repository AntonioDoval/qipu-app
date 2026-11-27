-- ═══════════════════════════════════════════════════════════════════════════════
-- Qipu — Migration 005: where Qipu keeps the user's files
--
-- The user chooses the name and location of their Qipu folder in Google Drive.
-- Qipu always creates a NEW folder (Drive never overwrites folders with the same
-- name) and remembers its id here. Existing columns' permissions (003) already let
-- each user read and update only their own profile.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column drive_folder_id text,
  add column drive_folder_name text check (char_length(drive_folder_name) <= 255);
