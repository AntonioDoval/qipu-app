// The real data layer (src/data/supabase.ts) against a real Postgres with all migrations,
// served by PostgREST (what Supabase uses to answer the app's requests).
// Runs in the GitHub check ("Data layer against a real database"); skipped elsewhere.
// Two users (A and B) prove that row-level security keeps their libraries apart.

import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import type { QipuSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import type { QipuData } from './repository';
import { createSupabaseData } from './supabase';
import { ConflictError } from './types';

const URL_ = process.env.QIPU_PGRST_URL;
const SECRET = process.env.QIPU_JWT_SECRET ?? '';
// Created by the workflow before the tests run (see .github/workflows/check.yml).
const USER_A = '00000000-0000-0000-0000-00000000c0a1';
const USER_B = '00000000-0000-0000-0000-00000000c0b2';

const b64 = (data: object) => Buffer.from(JSON.stringify(data)).toString('base64url');
function jwtFor(sub: string): string {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ sub, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 });
  const sig = createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

function dataFor(userId: string): QipuData {
  // PostgREST answers at the root; Supabase serves it under /rest/v1.
  const rewrite: typeof fetch = (input, init) => fetch(String(input).replace('/rest/v1', ''), init);
  const client = createClient<Database>(URL_!, 'test-anon-key', {
    global: { headers: { Authorization: `Bearer ${jwtFor(userId)}` }, fetch: rewrite },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return createSupabaseData(client as unknown as QipuSupabaseClient, { userId });
}

describe.skipIf(!URL_)('Supabase data layer against a real database', () => {
  let a: QipuData;
  let b: QipuData;

  beforeAll(() => {
    a = dataFor(USER_A);
    b = dataFor(USER_B);
  });

  it('creates bibliography items with automatic, unique citekeys', async () => {
    const csl = { author: [{ family: 'Mauss', given: 'Marcel' }], issued: { 'date-parts': [[1925]] } };
    const first = await a.createItem({ kind: 'bibliography', type: 'article-journal', title: 'Essai sur le don', csl });
    const second = await a.createItem({ kind: 'bibliography', type: 'book', title: 'Sociologie et anthropologie', csl });
    expect(first.citekey).toBe('mauss1925');
    expect(second.citekey).toBe('mauss1925b');
    expect(first.year).toBe(1925);
    expect(first.creatorsText).toBe('Marcel Mauss');
  });

  it('keeps a note’s #tags and [[links]] in sync with its text', async () => {
    const note = await a.createItem({ kind: 'note', type: 'note', title: 'Don y ayni', body: 'Ver [[Essai sur le don]] #andes/ayni #feria' });
    const [tags, itemTags, links, items] = await Promise.all([a.listTags(), a.listItemTags(), a.listLinks(), a.listItems()]);
    const paths = itemTags.filter((r) => r.itemId === note.id).map((r) => tags.find((t) => t.id === r.tagId)!.path).sort();
    expect(paths).toEqual(['andes/ayni', 'feria']);
    const essai = items.find((i) => i.title === 'Essai sur le don')!;
    expect(links).toContainEqual({ fromItemId: note.id, toItemId: essai.id, origin: 'text' });

    const saved = await a.saveNote(note.id, { title: 'Don y ayni', body: 'Sin enlaces ahora #feria' }, note.revision);
    expect(saved.revision).toBe(note.revision + 1);
    expect((await a.listLinks()).some((l) => l.fromItemId === note.id)).toBe(false);
  });

  it('refuses to overwrite a note changed elsewhere (two tabs)', async () => {
    const note = await a.createItem({ kind: 'note', type: 'note', title: 'Two tabs', body: 'v1' });
    await a.saveNote(note.id, { title: 'Two tabs', body: 'from tab 1' }, note.revision);
    await expect(a.saveNote(note.id, { title: 'Two tabs', body: 'from tab 2' }, note.revision)).rejects.toBeInstanceOf(ConflictError);
    expect((await a.getItem(note.id))!.body).toBe('from tab 1');
    expect((await a.listNoteVersions(note.id)).length).toBeGreaterThanOrEqual(1);
  });

  it('rewrites [[links]] when an item is renamed, and #tags when a tag is renamed', async () => {
    const target = await a.createItem({ kind: 'bibliography', type: 'book', title: 'Old title', csl: {} });
    const note = await a.createItem({ kind: 'note', type: 'note', title: 'Links here', body: 'See [[Old title|this]] #mercado/papa' });
    await a.renameItem(target.id, 'New title');
    expect((await a.getItem(note.id))!.body).toContain('[[New title|this]]');

    await a.renameTag('mercado', 'feria-dominical');
    const after = await a.getItem(note.id);
    expect(after!.body).toContain('#feria-dominical/papa');
    expect((await a.listTags()).map((t) => t.path)).toContain('feria-dominical/papa');
  });

  it('tags, projects (nested) and links on items', async () => {
    const item = await a.createItem({ kind: 'source', type: 'interview', title: 'Entrevista a Doña R.', csl: { issued: { 'date-parts': [[2026, 3]] } } });
    expect(item.datePrecision).toBe('month');
    await a.setItemTags(item.id, ['andes/feria', 'method']);
    await a.addTagToItems([item.id], 'to-revisit');
    const tags = await a.listTags();
    const own = (await a.listItemTags()).filter((r) => r.itemId === item.id).map((r) => tags.find((t) => t.id === r.tagId)!.path).sort();
    expect(own).toEqual(['andes/feria', 'method', 'to-revisit']);

    const thesis = await a.createProject({ name: 'Thesis' });
    const ch2 = await a.createProject({ name: 'Ch. 2', parentId: thesis.id });
    await a.setItemProjects(item.id, [ch2.id]);
    expect((await a.listItemProjects()).filter((r) => r.itemId === item.id)).toEqual([{ itemId: item.id, projectId: ch2.id }]);
    await a.deleteProject(thesis.id);
    expect((await a.listProjects()).find((p) => p.id === ch2.id)!.parentId).toBeNull();
  });

  it('annotations inherit their item’s tags', async () => {
    const item = await a.createItem({ kind: 'bibliography', type: 'book', title: 'Argonauts', csl: {} });
    await a.setItemTags(item.id, ['exchange/kula']);
    const hl = await a.createAnnotation({
      itemId: item.id, kind: 'highlight', color: 1, page: 81,
      quote: { exact: 'The Kula is a form of exchange', prefix: '', suffix: '' }, text: 'The Kula is a form of exchange', locator: 'p. 81',
    });
    await a.setAnnotationTags(hl.id, ['circulation']);
    const tags = await a.listTags();
    const effective = (await a.listAnnotationTags()).filter((r) => r.annotationId === hl.id)
      .map((r) => `${tags.find((t) => t.id === r.tagId)!.path}:${r.inherited}`).sort();
    expect(effective).toEqual(['circulation:false', 'exchange/kula:true']);
    await a.deleteAnnotation(hl.id);
    expect((await a.listAnnotations(item.id))).toHaveLength(0);
    await a.restoreAnnotation(hl.id);
    expect((await a.listAnnotations(item.id))).toHaveLength(1);
  });

  it('stores PDF text per page and finds it without accents', async () => {
    const pdf = await a.createItem({
      kind: 'bibliography', type: 'book', title: 'Reciprocidad e intercambio', csl: {},
      contentSource: 'drive_pdf', drive: { fileId: 'drive-test-1', fileName: 'x.pdf', fileSize: 1, sha256: null }, pageCount: 2,
    });
    await a.savePageTexts(pdf.id, ['Primera página', 'El ayni y la minga en Huancayo\u0000']);
    const hits = await a.search('MINGA');
    expect(hits).toContainEqual(expect.objectContaining({ itemId: pdf.id, page: 2 }));
    expect(hits.find((h) => h.itemId === pdf.id)!.snippet).toContain('⟦minga⟧');
    expect((await a.search('reciprocidád')).some((h) => h.itemId === pdf.id)).toBe(true);
  });

  it('trash, recently opened, profile and palette', async () => {
    const item = await a.createItem({ kind: 'note', type: 'note', title: 'To the trash', body: '' });
    await a.trashItems([item.id]);
    expect((await a.listItems()).some((i) => i.id === item.id)).toBe(false);
    expect((await a.listItems({ trash: true })).some((i) => i.id === item.id)).toBe(true);
    await a.restoreItems([item.id]);
    expect((await a.listItems()).some((i) => i.id === item.id)).toBe(true);

    await a.markOpened(item.id);
    expect((await a.listRecent(1))[0].itemId).toBe(item.id);

    const profile = await a.getProfile();
    expect(profile.palette).toHaveLength(5);
    await a.updatePalette(profile.palette.map((p, k) => ({ ...p, name: k === 0 ? 'Key argument' : p.name })));
    await a.addSourceType('Price list');
    const updated = await a.getProfile();
    expect(updated.palette[0].name).toBe('Key argument');
    expect(updated.sourceTypes).toContain('Price list');
  });

  it('user B sees and reaches nothing of user A', async () => {
    const aItems = await a.listItems();
    expect(aItems.length).toBeGreaterThan(0);
    expect(await b.listItems()).toHaveLength(0);
    expect(await b.getItem(aItems[0].id)).toBeNull();
    expect(await b.search('mauss')).toHaveLength(0);
    expect(await b.listAnnotations()).toHaveLength(0);
    await expect(b.addLink(aItems[0].id, aItems[1].id)).rejects.toThrow();
    await b.trashItems([aItems[0].id]); // matches nothing under row-level security
    expect((await a.getItem(aItems[0].id))!.deletedAt).toBeNull();
  });
});
