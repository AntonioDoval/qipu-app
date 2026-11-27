-- Migration 004: each user saves, reads and forgets only their own encrypted Google key.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'g1@example.com'),
  ('00000000-0000-0000-0000-0000000000d2', 'g2@example.com');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', false);
select public.save_google_credentials('cipher-one', 'drive.file');
select public.save_google_credentials('cipher-one-updated', 'drive.file');   -- replaces, no duplicate
do $$ begin
  if (select refresh_token_encrypted from public.my_google_credentials()) <> 'cipher-one-updated' then
    raise exception 'own credentials not saved or not updated';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d2', false);
do $$ begin
  if exists (select 1 from public.my_google_credentials()) then
    raise exception 'user 2 can read user 1''s Google credentials';
  end if;
end $$;
select public.forget_google_credentials();   -- user 2 forgetting must not touch user 1

reset role;
set role anon;
do $$ declare refused boolean := false; begin
  begin perform public.my_google_credentials(); exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'anon can call my_google_credentials'; end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from private.google_credentials) <> 1 then
    raise exception 'expected exactly user 1''s row to remain';
  end if;
end $$;
