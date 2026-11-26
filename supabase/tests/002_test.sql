-- Behaviour checks for migration 002. Every block raises an error if a rule is broken,
-- which makes scripts/test-migrations.sh (and the GitHub check) fail.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.com');

-- ═══ As user A ═══════════════════════════════════════════════════════════════
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);

-- Citekeys: surnameyear, duplicates get b; also inside one multi-row insert (BibTeX import).
insert into public.items (kind, type, title, csl) values
  ('bibliography', 'book', 'Argonauts of the Western Pacific',
   '{"author":[{"family":"Malinowski","given":"Bronisław"}],"issued":{"date-parts":[[1922]]},"publisher":"Routledge"}'),
  ('bibliography', 'book', 'Second Malinowski 1922 (test)',
   '{"author":[{"family":"Malinowski","given":"Bronisław"}],"issued":{"date-parts":[[1922]]}}'),
  ('bibliography', 'article-journal', 'Essai sur le don',
   '{"author":[{"family":"Mauss","given":"Marcel"}],"issued":{"date-parts":[[1925]]},"container-title":"L''Année sociologique"}'),
  ('bibliography', 'book', 'Reciprocidad e intercambio en los Andes peruanos',
   '{"author":[{"family":"Alberti","given":"Giorgio"},{"family":"Mayer","given":"Enrique"}],"issued":{"date-parts":[[1974]]}}');

do $$ begin
  if (select string_agg(citekey, ',' order by citekey) from public.items)
     is distinct from 'alberti1974,malinowski1922,malinowski1922b,mauss1925' then
    raise exception 'citekeys wrong: %', (select string_agg(citekey, ',' order by citekey) from public.items);
  end if;
  if (select creators_text from public.items where citekey = 'alberti1974') <> 'Giorgio Alberti; Enrique Mayer'
     or (select sort_creator from public.items where citekey = 'alberti1974') <> 'alberti' then
    raise exception 'creators not derived from csl';
  end if;
  if (select year from public.items where citekey = 'mauss1925') <> 1925 then
    raise exception 'year not derived from csl';
  end if;
end $$;

-- Citekeys stay stable when the year is corrected.
update public.items set csl = jsonb_set(csl, '{issued,date-parts}', '[[1923]]') where citekey = 'mauss1925';
do $$ begin
  if not exists (select 1 from public.items where citekey = 'mauss1925' and year = 1923) then
    raise exception 'citekey changed, or year not re-derived';
  end if;
end $$;

-- Sources: partial dates and user-defined types.
insert into public.items (kind, type, title, csl, content_source, body) values
  ('source', 'interview', 'Entrevista a Doña R.', '{"author":[{"literal":"Doña R."}],"issued":{"date-parts":[[2026,3,14]]}}',
   'pasted', 'R: Se le fía, pues. Acá nadie fía, dicen, pero todos deben.'),
  ('source', 'Price list', 'Precios de la feria', '{"issued":{"date-parts":[[2019,3]]}}', 'none', null);
do $$ begin
  if not exists (select 1 from public.items where title = 'Precios de la feria'
                 and year = 2019 and date_precision = 'month' and date_value = '2019-03-01') then
    raise exception 'partial date not derived';
  end if;
  if not exists (select 1 from public.items where title = 'Entrevista a Doña R.' and date_precision = 'day') then
    raise exception 'full date not derived';
  end if;
end $$;

-- Notes, search (accent-insensitive, any language), PDF page search.
insert into public.items (kind, type, title, body) values
  ('note', 'note', 'Ayni vs. the Maussian gift', 'Notas sobre el ayni y la minga. #andes/ayni');
insert into public.items (kind, type, title, csl, content_source, drive_file_id, page_count, has_text_layer)
values ('bibliography', 'book', 'Argonauts PDF copy',
        '{"author":[{"family":"Malinowski","given":"Bronisław"}],"issued":{"date-parts":[[1922]]}}',
        'drive_pdf', 'drive-file-1', 527, true);
insert into public.item_pages (item_id, page, text)
select id, 81, 'The Kula is a form of exchange, of extensive, inter-tribal character'
from public.items where title = 'Argonauts PDF copy';

do $$ begin
  if not exists (select 1 from public.search_library('minga') s join public.items i on i.id = s.item_id
                 where i.kind = 'note') then
    raise exception 'search misses note text';
  end if;
  if not exists (select 1 from public.search_library('reciprocidád') s join public.items i on i.id = s.item_id
                 where i.citekey = 'alberti1974') then
    raise exception 'search is not accent-insensitive';
  end if;
  if (select count(*) from public.search_library('BRONISLAW')) < 2 then
    raise exception 'search misses authors (ł → l)';
  end if;
  if not exists (select 1 from public.search_library('kula') where page = 81 and snippet like '%⟦Kula⟧%') then
    raise exception 'PDF page search or snippet broken';
  end if;
  if (select citekey from public.items where title = 'Argonauts PDF copy') <> 'malinowski1922c' then
    raise exception 'third malinowski1922 should be malinowski1922c';
  end if;
end $$;

-- Revision and note version history (at most one snapshot per 10 minutes).
update public.items set body = body || ' Más texto.' where kind = 'note';
update public.items set body = body || ' Y más.' where kind = 'note';
do $$ begin
  if (select revision from public.items where kind = 'note') <> 3 then
    raise exception 'revision not incremented';
  end if;
  if (select count(*) from public.note_versions) <> 1 then
    raise exception 'expected exactly 1 note version, got %', (select count(*) from public.note_versions);
  end if;
  if (select body from public.note_versions) <> 'Notas sobre el ayni y la minga. #andes/ayni' then
    raise exception 'version does not hold the previous text';
  end if;
end $$;

-- Tags are paths; bad paths are refused.
insert into public.tags (path) values ('andes'), ('andes/ayni');
do $$ declare refused integer := 0; begin
  begin insert into public.tags (path) values ('bad tag'); exception when check_violation then refused := refused + 1; end;
  begin insert into public.tags (path) values ('#andes'); exception when check_violation then refused := refused + 1; end;
  begin insert into public.tags (path) values ('andes//ayni'); exception when check_violation then refused := refused + 1; end;
  begin insert into public.tags (path) values ('ANDES/AYNI'); exception when unique_violation then refused := refused + 1; end;
  if refused <> 4 then raise exception 'bad tag paths accepted (% of 4 refused)', refused; end if;
end $$;

-- Annotations: highlights need text, drawings need a PDF page.
insert into public.annotations (item_id, kind, color, page, position, quote, text, locator)
select id, 'highlight', 1, 81, '{"rects":[[72,700,400,712]]}',
       '{"exact":"The Kula is a form of exchange","prefix":"","suffix":", of extensive","start":0,"end":30}',
       'The Kula is a form of exchange', 'p. 81'
from public.items where title = 'Argonauts PDF copy';
do $$ declare refused integer := 0; aid uuid; begin
  select id into aid from public.items where title = 'Argonauts PDF copy';
  begin insert into public.annotations (item_id, kind, color, page) values (aid, 'highlight', 1, 81);
  exception when check_violation then refused := refused + 1; end;
  begin insert into public.annotations (item_id, kind, color) values (aid, 'square', 2);
  exception when check_violation then refused := refused + 1; end;
  begin insert into public.annotations (item_id, kind, color, page, position) values (aid, 'star', 6, 81, '{"box":[1,2,3,4]}');
  exception when check_violation then refused := refused + 1; end;
  if refused <> 3 then raise exception 'invalid annotations accepted (% of 3 refused)', refused; end if;
end $$;

-- Projects: 20 levels allowed, 21 refused, cycles refused.
do $$ declare pid uuid := null; nid uuid; refused integer := 0; begin
  for i in 0..20 loop
    insert into public.projects (name, parent_id) values ('p' || i, pid) returning id into nid;
    pid := nid;
  end loop;
  begin insert into public.projects (name, parent_id) values ('too deep', pid);
  exception when others then refused := refused + 1; end;
  begin update public.projects set parent_id = pid where name = 'p0';
  exception when others then refused := refused + 1; end;
  if refused <> 2 then raise exception 'project depth/cycle rules broken'; end if;
end $$;

-- Remember A's ids for the next section.
select set_config('qipu.a_item', (select id::text from public.items where citekey = 'alberti1974'), false);
select set_config('qipu.a_tag', (select id::text from public.tags where path = 'andes'), false);
select set_config('qipu.a_project', (select id::text from public.projects where name = 'p0'), false);
select set_config('qipu.a_annotation', (select id::text from public.annotations limit 1), false);

-- ═══ As user B: must not see or touch anything of A's ════════════════════════
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', false);
insert into public.items (kind, type, title) values ('note', 'note', 'B''s note');
insert into public.tags (path) values ('andes');   -- same path as A: fine, tags are per user

do $$
declare
  a_item uuid := current_setting('qipu.a_item')::uuid;
  a_tag  uuid := current_setting('qipu.a_tag')::uuid;
  a_proj uuid := current_setting('qipu.a_project')::uuid;
  a_ann  uuid := current_setting('qipu.a_annotation')::uuid;
  b_item uuid := (select id from public.items where title = 'B''s note');
  b_tag  uuid := (select id from public.tags where path = 'andes');
  refused integer := 0;
begin
  if (select count(*) from public.items) <> 1 then raise exception 'B can see A''s items'; end if;
  if (select count(*) from public.annotations) <> 0 then raise exception 'B can see A''s annotations'; end if;
  if (select count(*) from public.note_versions) <> 0 then raise exception 'B can see A''s note history'; end if;
  if (select count(*) from public.search_library('malinowski')) <> 0 then raise exception 'B''s search finds A''s items'; end if;

  begin insert into public.item_tags values (a_item, b_tag);         exception when insufficient_privilege then refused := refused + 1; end;
  begin insert into public.item_tags values (b_item, a_tag);         exception when insufficient_privilege then refused := refused + 1; end;
  begin insert into public.item_links (from_item_id, to_item_id) values (b_item, a_item);
                                                                     exception when insufficient_privilege then refused := refused + 1; end;
  begin insert into public.item_projects values (b_item, a_proj);    exception when insufficient_privilege then refused := refused + 1; end;
  begin insert into public.note_annotations values (b_item, a_ann);  exception when insufficient_privilege then refused := refused + 1; end;
  begin insert into public.items (kind, type, title, anchor_item_id) values ('note', 'note', 'sneaky', a_item);
                                                                     exception when insufficient_privilege then refused := refused + 1; end;
  begin insert into public.annotations (item_id, kind, color, quote, text) values (a_item, 'highlight', 1, '{"exact":"x"}', 'x');
                                                                     exception when insufficient_privilege then refused := refused + 1; end;
  begin insert into public.projects (name, parent_id) values ('sneaky', a_proj);
                                                                     exception when others then refused := refused + 1; end;
  begin insert into public.items (user_id, kind, type, title) values ('00000000-0000-0000-0000-0000000000a1', 'note', 'note', 'forged');
                                                                     exception when insufficient_privilege then refused := refused + 1; end;
  if refused <> 9 then raise exception 'cross-user writes allowed (% of 9 refused)', refused; end if;

  update public.items set title = 'hacked' where id = a_item;   -- silently matches nothing under RLS
  delete from public.items where id = a_item;
end $$;

-- Browser roles cannot reach server-only things.
do $$ declare refused integer := 0; begin
  begin perform public.purge_trash(); exception when insufficient_privilege then refused := refused + 1; end;
  begin perform 1 from private.google_credentials; exception when insufficient_privilege then refused := refused + 1; end;
  if refused <> 2 then raise exception 'browser roles reach server-only functions or tables'; end if;
end $$;

-- ═══ Back as admin: A's data untouched ═══════════════════════════════════════
reset role;
do $$ begin
  if not exists (select 1 from public.items where citekey = 'alberti1974'
                 and title = 'Reciprocidad e intercambio en los Andes peruanos') then
    raise exception 'B changed or deleted A''s item';
  end if;
end $$;
