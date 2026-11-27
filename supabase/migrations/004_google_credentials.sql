-- ═══════════════════════════════════════════════════════════════════════════════
-- Qipu — Migration 004: saving and reading the user's Google Drive key
--
-- The Google refresh token is encrypted by the server (Netlify) with a key that only the
-- server has, then stored in private.google_credentials. These three functions let a
-- signed-in user save, read and forget ONLY THEIR OWN encrypted token. Reading it from
-- the browser is harmless: without the server's key it cannot be decrypted.
-- No service-role key is needed anywhere.
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.save_google_credentials(p_refresh_token_encrypted text, p_scopes text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if coalesce(p_refresh_token_encrypted, '') = '' then
    raise exception 'Empty token';
  end if;
  insert into private.google_credentials (user_id, refresh_token_encrypted, scopes, updated_at)
  values (auth.uid(), p_refresh_token_encrypted, coalesce(p_scopes, ''), now())
  on conflict (user_id) do update
    set refresh_token_encrypted = excluded.refresh_token_encrypted,
        scopes = excluded.scopes,
        updated_at = now();
end $$;

create or replace function public.my_google_credentials()
returns table (refresh_token_encrypted text, scopes text, updated_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.refresh_token_encrypted, c.scopes, c.updated_at
  from private.google_credentials c
  where c.user_id = auth.uid()
$$;

-- Used when Google says the token was revoked (e.g. access removed in the Google account).
create or replace function public.forget_google_credentials()
returns void language sql security definer set search_path = ''
as $$ delete from private.google_credentials where user_id = auth.uid() $$;

revoke all on function public.save_google_credentials(text, text), public.my_google_credentials(), public.forget_google_credentials()
  from public, anon;
grant execute on function public.save_google_credentials(text, text), public.my_google_credentials(), public.forget_google_credentials()
  to authenticated, service_role;
