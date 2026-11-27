-- Minimal stand-in for the parts of Supabase that our migrations rely on,
-- so they can be tested on a plain Postgres (locally or in GitHub Actions).
-- Never run this against a real Supabase project.

-- Roles Supabase creates: the browser uses anon / authenticated; servers use service_role.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

-- Like current Supabase projects: the roles may use the public schema, but NEW tables and
-- functions are NOT granted to them automatically. Every migration must grant what the app
-- needs, explicitly (see 003_grants.sql). Functions are not executable by everyone by default.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public revoke execute on functions from public;

create schema if not exists auth;
create schema if not exists extensions;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

-- Supabase's auth.uid(): the signed-in user's id, taken from the request's JWT.
-- PostgREST puts the JWT claims in request.jwt.claims; SQL tests set request.jwt.claim.sub directly.
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;
