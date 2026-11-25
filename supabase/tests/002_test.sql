-- Behaviour checks for migration 002. Each block raises an error if a rule is broken.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'test@example.com');

-- Search: accent-insensitive, and covers inline text of notes.
insert into public.items (user_id, type, title, inline_content)
values ('00000000-0000-0000-0000-0000000000a1', 'note', 'Reciprocidad andina', 'Notas sobre el ayni y la minga');
do $$ begin
  if not exists (select 1 from public.items where search_vector @@ to_tsquery('simple', public.qipu_unaccent('minga'))) then
    raise exception 'search does not cover note text'; end if;
  if not exists (select 1 from public.items where search_vector @@ to_tsquery('simple', public.qipu_unaccent('reciprocidád'))) then
    raise exception 'search is not accent-insensitive'; end if;
end $$;

-- Projects: 20 levels allowed, 21 rejected, cycles rejected.
do $$ declare pid uuid := null; nid uuid; ok boolean;
begin
  for i in 0..20 loop
    insert into public.projects (user_id, name, parent_id)
    values ('00000000-0000-0000-0000-0000000000a1', 'p' || i, pid) returning id into nid;
    pid := nid;
  end loop;
  ok := false;
  begin insert into public.projects (user_id, name, parent_id) values ('00000000-0000-0000-0000-0000000000a1', 'too deep', pid);
  exception when others then ok := true; end;
  if not ok then raise exception 'depth 21 was allowed'; end if;
  ok := false;
  begin update public.projects set parent_id = pid where name = 'p0';
  exception when others then ok := true; end;
  if not ok then raise exception 'project cycle was allowed'; end if;
end $$;
