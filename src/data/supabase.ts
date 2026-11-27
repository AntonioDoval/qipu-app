// The Supabase implementation of QipuData. The only file that talks to the database.
// Row-level security in the database guarantees each user only reaches their own rows;
// this file never needs to filter by user for safety.

import type { PostgrestError } from '@supabase/supabase-js';
import type { QipuSupabaseClient } from '@/lib/supabase/client';
import type { Database, Json } from '@/types/database';
import { foldText } from '@/lib/format';
import { parseNoteLinks, parseNoteTags, renameLinks, renameTagInText } from '@/lib/notes';
import { isTagUnder, normalizeTagPath } from '@/lib/tags';
import type { QipuData } from './repository';
import {
  ConflictError,
  DataError,
  type Annotation,
  type AnnotationDraft,
  type AnnotationKind,
  type AnnotationPatch,
  type AnnotationPosition,
  type ColorSlot,
  type ContentSource,
  type CslData,
  type Item,
  type ItemDraft,
  type ItemKind,
  type PaletteSlot,
  type Profile,
  type Project,
  type Tag,
  type TextQuote,
} from './types';

type Tables = Database['public']['Tables'];
type ItemRow = Omit<Tables['items']['Row'], 'search_vector'>;
type AnnotationRow = Tables['annotations']['Row'];
type ProjectRow = Tables['projects']['Row'];

// Every item column except the search index (large, and of no use to the app).
const ITEM_COLUMNS =
  'id, user_id, kind, type, title, citekey, csl, metadata, body, content_source, drive_file_id, file_name, file_size, file_sha256, page_count, has_text_layer, anchor_item_id, year, date_value, date_precision, creators_text, sort_creator, revision, deleted_at, created_at, updated_at' as const;

const PAGE_SIZE = 1000; // Supabase returns at most 1000 rows per request
const ID_CHUNK = 100; // keeps "id in (…)" lists short enough for a URL

// ─── small helpers ────────────────────────────────────────────────────────────

function check(error: PostgrestError | null, what: string): void {
  if (error) throw new DataError(`Could not ${what}: ${error.message}`, error);
}

function must<T>(result: { data: T | null; error: PostgrestError | null }, what: string): NonNullable<T> {
  check(result.error, what);
  if (result.data === null || result.data === undefined) throw new DataError(`Could not ${what}: nothing was returned`);
  return result.data as NonNullable<T>;
}

function chunks<T>(list: T[], size = ID_CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Reads every row of a query, 1000 at a time. `page(from, to)` must order the rows. */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
  what: string,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    check(error, what);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return all;
  }
}

const asJson = (value: unknown) => value as Json;
const now = () => new Date().toISOString();
// Postgres text cannot contain the NUL character, which PDF text extraction sometimes produces.
const cleanText = (text: string) => text.replace(/\u0000/g, '');

// ─── row ↔ Qipu shapes ────────────────────────────────────────────────────────

function toItem(r: ItemRow): Item {
  return {
    id: r.id,
    kind: r.kind as ItemKind,
    type: r.type,
    title: r.title,
    citekey: r.citekey,
    csl: (r.csl ?? {}) as unknown as CslData,
    metadata: (r.metadata ?? {}) as Record<string, unknown>,
    body: r.body,
    contentSource: r.content_source as ContentSource,
    drive: r.drive_file_id
      ? { fileId: r.drive_file_id, fileName: r.file_name, fileSize: r.file_size, sha256: r.file_sha256 }
      : null,
    pageCount: r.page_count,
    hasTextLayer: r.has_text_layer,
    anchorItemId: r.anchor_item_id,
    year: r.year,
    datePrecision: r.date_precision as Item['datePrecision'],
    creatorsText: r.creators_text,
    sortCreator: r.sort_creator,
    revision: r.revision,
    deletedAt: r.deleted_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function itemFields(d: Partial<ItemDraft>): Partial<Tables['items']['Insert']> {
  const row: Partial<Tables['items']['Insert']> = {};
  if (d.kind !== undefined) row.kind = d.kind;
  if (d.type !== undefined) row.type = d.type;
  if (d.title !== undefined) row.title = d.title.trim();
  if (d.citekey !== undefined) row.citekey = d.citekey;
  if (d.csl !== undefined) row.csl = asJson(d.csl);
  if (d.metadata !== undefined) row.metadata = asJson(d.metadata);
  if (d.body !== undefined) row.body = d.body === null ? null : cleanText(d.body);
  if (d.contentSource !== undefined) row.content_source = d.contentSource;
  if (d.drive !== undefined) {
    row.drive_file_id = d.drive?.fileId ?? null;
    row.file_name = d.drive?.fileName ?? null;
    row.file_size = d.drive?.fileSize ?? null;
    row.file_sha256 = d.drive?.sha256 ?? null;
  }
  if (d.pageCount !== undefined) row.page_count = d.pageCount;
  if (d.hasTextLayer !== undefined) row.has_text_layer = d.hasTextLayer;
  if (d.anchorItemId !== undefined) row.anchor_item_id = d.anchorItemId;
  return row;
}

function toAnnotation(r: AnnotationRow): Annotation {
  return {
    id: r.id,
    itemId: r.item_id,
    kind: r.kind as AnnotationKind,
    color: r.color as ColorSlot,
    page: r.page,
    position: r.position as AnnotationPosition | null,
    quote: r.quote as TextQuote | null,
    text: r.text,
    locator: r.locator,
    deletedAt: r.deleted_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toProject(r: ProjectRow): Project {
  return {
    id: r.id,
    parentId: r.parent_id,
    name: r.name,
    description: r.description,
    color: r.color,
    archived: r.archived,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

// ─── the implementation ───────────────────────────────────────────────────────

export function createSupabaseData(client: QipuSupabaseClient): QipuData {
  let userId: string | null = null;

  async function uid(): Promise<string> {
    if (userId) return userId;
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new DataError('You are not signed in.', error);
    userId = data.user.id;
    return userId;
  }

  async function getItemRow(id: string): Promise<ItemRow | null> {
    const { data, error } = await client.from('items').select(ITEM_COLUMNS).eq('id', id).maybeSingle();
    check(error, 'load the item');
    return data;
  }

  /** Make sure these tag paths exist; returns them (existing spelling kept, matched case-insensitively). */
  async function ensureTags(paths: string[]): Promise<Tag[]> {
    const wanted = new Map<string, string>();
    for (const p of paths) {
      const path = normalizeTagPath(p);
      if (!path) throw new DataError(`"${p}" is not a valid tag (no spaces, no #, levels separated by /).`);
      if (!wanted.has(path.toLowerCase())) wanted.set(path.toLowerCase(), path);
    }
    if (wanted.size === 0) return [];
    const existing = await api.listTags();
    const byKey = new Map(existing.map((t) => [t.path.toLowerCase(), t]));
    const missing = [...wanted.entries()].filter(([key]) => !byKey.has(key)).map(([, path]) => ({ path }));
    if (missing.length) {
      const { data, error } = await client.from('tags').insert(missing).select('id, path, color');
      if (error?.code === '23505') return ensureTags(paths); // created meanwhile (e.g. another tab): read again
      check(error, 'create tags');
      for (const t of data ?? []) byKey.set(t.path.toLowerCase(), t);
    }
    return [...wanted.keys()].map((key) => byKey.get(key)!);
  }

  /** Make an item's or annotation's tags exactly `paths`: delete the rest, add what is missing. */
  async function replaceTagLinks(owner: 'item' | 'annotation', ownerId: string, paths: string[]): Promise<void> {
    const tags = await ensureTags(paths);
    const wanted = new Set(tags.map((t) => t.id));
    const { data, error } =
      owner === 'item'
        ? await client.from('item_tags').select('tag_id').eq('item_id', ownerId)
        : await client.from('annotation_tags').select('tag_id').eq('annotation_id', ownerId);
    check(error, 'load tags');
    const current = new Set((data ?? []).map((r) => r.tag_id));
    const remove = [...current].filter((id) => !wanted.has(id));
    const add = [...wanted].filter((id) => !current.has(id));
    if (remove.length) {
      const res =
        owner === 'item'
          ? await client.from('item_tags').delete().eq('item_id', ownerId).in('tag_id', remove)
          : await client.from('annotation_tags').delete().eq('annotation_id', ownerId).in('tag_id', remove);
      check(res.error, 'remove tags');
    }
    if (add.length) {
      const res =
        owner === 'item'
          ? await client.from('item_tags').insert(add.map((tag_id) => ({ item_id: ownerId, tag_id })))
          : await client.from('annotation_tags').insert(add.map((tag_id) => ({ annotation_id: ownerId, tag_id })));
      check(res.error, 'add tags');
    }
  }

  /** Bring a note's tags and text links in line with its Markdown. */
  async function syncNoteReferences(note: Item): Promise<void> {
    const body = note.body ?? '';
    await replaceTagLinks('item', note.id, parseNoteTags(body));

    const titles = parseNoteLinks(body);
    const { data: current, error } = await client
      .from('item_links')
      .select('to_item_id')
      .eq('from_item_id', note.id)
      .eq('origin', 'text');
    check(error, 'load the note\'s links');
    const currentIds = new Set((current ?? []).map((r) => r.to_item_id));

    const wanted = new Set<string>();
    if (titles.length) {
      // Resolve titles to items. A link that already points to an item with that title keeps
      // pointing there, so two items with the same title don't swap.
      const all = await fetchAll(
        (from, to) =>
          client.from('items').select('id, title').is('deleted_at', null).order('created_at').order('id').range(from, to),
        'resolve links',
      );
      const byTitle = new Map<string, string[]>();
      for (const it of all) {
        if (it.id === note.id) continue;
        const key = foldText(it.title);
        byTitle.set(key, [...(byTitle.get(key) ?? []), it.id]);
      }
      for (const title of titles) {
        const candidates = byTitle.get(foldText(title)) ?? [];
        const kept = candidates.find((id) => currentIds.has(id));
        const target = kept ?? candidates[0];
        if (target) wanted.add(target); // no match yet: the link shows as "create this note"
      }
    }

    const remove = [...currentIds].filter((id) => !wanted.has(id));
    const add = [...wanted].filter((id) => !currentIds.has(id));
    if (remove.length) {
      const res = await client
        .from('item_links')
        .delete()
        .eq('from_item_id', note.id)
        .eq('origin', 'text')
        .in('to_item_id', remove);
      check(res.error, 'remove links');
    }
    if (add.length) {
      const res = await client
        .from('item_links')
        .insert(add.map((to_item_id) => ({ from_item_id: note.id, to_item_id, origin: 'text' })));
      check(res.error, 'add links');
    }
  }

  const api: QipuData = {
    // ── Profile ──────────────────────────────────────────────────────────────
    async getProfile(): Promise<Profile> {
      const id = await uid();
      const { data: r, error } = await client.from('profiles').select('*').eq('id', id).single();
      check(error, 'load your profile');
      if (!r) throw new DataError('Your profile was not found.');
      return {
        id: r.id,
        email: r.email,
        fullName: r.full_name,
        avatarUrl: r.avatar_url,
        locale: r.locale === 'en' ? 'en' : 'es',
        palette: (r.palette as unknown as PaletteSlot[]) ?? [],
        sourceTypes: r.source_types ?? [],
      };
    },

    async updatePalette(palette) {
      if (palette.length !== 5 || palette.some((p) => !HEX.test(p.color))) {
        throw new DataError('The palette needs exactly 5 colors written as #RRGGBB.');
      }
      const clean = palette.map((p) => ({ color: p.color, name: p.name?.trim() || null }));
      const res = await client.from('profiles').update({ palette: asJson(clean) }).eq('id', await uid());
      check(res.error, 'save the colors');
    },

    async addSourceType(label) {
      const name = label.trim();
      if (!name) return;
      const profile = await api.getProfile();
      if (profile.sourceTypes.some((t) => foldText(t) === foldText(name))) return;
      const res = await client
        .from('profiles')
        .update({ source_types: [...profile.sourceTypes, name] })
        .eq('id', profile.id);
      check(res.error, 'save the source type');
    },

    // ── Items ────────────────────────────────────────────────────────────────
    async listItems(options) {
      const rows = await fetchAll((from, to) => {
        const q = client.from('items').select(ITEM_COLUMNS);
        return (options?.trash ? q.not('deleted_at', 'is', null) : q.is('deleted_at', null))
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, to);
      }, 'load the library');
      return rows.map(toItem);
    },

    async getItem(id) {
      const row = await getItemRow(id);
      return row ? toItem(row) : null;
    },

    async createItem(draft) {
      const row = { ...itemFields(draft), user_id: await uid() } as Tables['items']['Insert'];
      const created = toItem(must(await client.from('items').insert(row).select(ITEM_COLUMNS).single(), 'create the item'));
      if (created.kind === 'note' && created.body) await syncNoteReferences(created);
      return created;
    },

    async updateItem(id, patch, expectedRevision) {
      let q = client.from('items').update(itemFields(patch)).eq('id', id);
      if (expectedRevision !== undefined) q = q.eq('revision', expectedRevision);
      const { data, error } = await q.select(ITEM_COLUMNS).maybeSingle();
      check(error, 'save the item');
      if (!data) throw expectedRevision !== undefined ? new ConflictError(id) : new DataError('Item not found.');
      return toItem(data);
    },

    async renameItem(id, title) {
      const before = await getItemRow(id);
      if (!before) throw new DataError('Item not found.');
      const renamed = toItem(
        must(await client.from('items').update({ title: title.trim() }).eq('id', id).select(ITEM_COLUMNS).single(), 'rename the item'),
      );
      // Rewrite [[Old title]] in the notes that link to this item through their text.
      const { data: links, error } = await client
        .from('item_links')
        .select('from_item_id')
        .eq('to_item_id', id)
        .eq('origin', 'text');
      check(error, 'find notes that link here');
      for (const { from_item_id } of links ?? []) {
        for (let attempt = 0; attempt < 2; attempt++) {
          const note = await api.getItem(from_item_id);
          if (!note || note.kind !== 'note' || !note.body) break;
          const body = renameLinks(note.body, before.title, renamed.title);
          if (body === note.body) break;
          try {
            await api.saveNote(note.id, { title: note.title, body }, note.revision);
            break;
          } catch (e) {
            if (!(e instanceof ConflictError)) throw e; // edited at the same moment: read again and retry once
          }
        }
      }
      return renamed;
    },

    async trashItems(ids) {
      for (const part of chunks(ids)) {
        const res = await client.from('items').update({ deleted_at: now() }).in('id', part);
        check(res.error, 'move to the trash');
      }
    },

    async restoreItems(ids) {
      for (const part of chunks(ids)) {
        const res = await client.from('items').update({ deleted_at: null }).in('id', part);
        check(res.error, 'restore from the trash');
      }
    },

    // ── Notes ────────────────────────────────────────────────────────────────
    async saveNote(id, content, expectedRevision) {
      const { data, error } = await client
        .from('items')
        .update({ title: content.title.trim() || 'Untitled', body: cleanText(content.body) })
        .eq('id', id)
        .eq('kind', 'note')
        .eq('revision', expectedRevision)
        .select(ITEM_COLUMNS)
        .maybeSingle();
      check(error, 'save the note');
      if (!data) throw new ConflictError(id);
      const note = toItem(data);
      await syncNoteReferences(note);
      return note;
    },

    async listNoteVersions(noteId) {
      const { data, error } = await client
        .from('note_versions')
        .select('id, note_id, title, body, saved_at')
        .eq('note_id', noteId)
        .order('created_at', { ascending: false });
      check(error, 'load the note\'s history');
      return (data ?? []).map((v) => ({ id: v.id, noteId: v.note_id, title: v.title, body: v.body, savedAt: v.saved_at }));
    },

    // ── Tags ─────────────────────────────────────────────────────────────────
    async listTags() {
      const rows = await fetchAll(
        (from, to) => client.from('tags').select('id, path, color').order('path').order('id').range(from, to),
        'load tags',
      );
      return rows;
    },

    async listItemTags() {
      const rows = await fetchAll(
        (from, to) => client.from('item_tags').select('item_id, tag_id').order('item_id').order('tag_id').range(from, to),
        'load tags',
      );
      return rows.map((r) => ({ itemId: r.item_id, tagId: r.tag_id }));
    },

    async setItemTags(itemId, paths) {
      const item = await getItemRow(itemId);
      if (item?.kind === 'note') throw new DataError('A note\'s tags come from its text: write #tag in the note.');
      await replaceTagLinks('item', itemId, paths);
    },

    async addTagToItems(itemIds, path) {
      const [tag] = await ensureTags([path]);
      for (const part of chunks(itemIds)) {
        const { data, error } = await client.from('items').select(ITEM_COLUMNS).in('id', part);
        check(error, 'load items');
        const notes = (data ?? []).filter((r) => r.kind === 'note').map(toItem);
        const others = (data ?? []).filter((r) => r.kind !== 'note');
        if (others.length) {
          const res = await client
            .from('item_tags')
            .upsert(others.map((r) => ({ item_id: r.id, tag_id: tag.id })), { onConflict: 'item_id,tag_id', ignoreDuplicates: true });
          check(res.error, 'add the tag');
        }
        for (const note of notes) {
          if (parseNoteTags(note.body ?? '').some((t) => t.toLowerCase() === tag.path.toLowerCase())) continue;
          const body = `${(note.body ?? '').trimEnd()}\n\n#${tag.path}`;
          await api.saveNote(note.id, { title: note.title, body }, note.revision);
        }
      }
    },

    async renameTag(oldPath, newPath) {
      const target = normalizeTagPath(newPath);
      if (!target) throw new DataError(`"${newPath}" is not a valid tag (no spaces, no #, levels separated by /).`);
      const tags = await api.listTags();
      const affected = tags.filter((t) => isTagUnder(t.path, oldPath));
      if (affected.length === 0) return;
      const renamed = affected.map((t) => ({ ...t, path: target + t.path.slice(oldPath.length) }));
      const others = new Set(tags.filter((t) => !affected.includes(t)).map((t) => t.path.toLowerCase()));
      const clash = renamed.find((t) => others.has(t.path.toLowerCase()));
      if (clash) throw new DataError(`A tag called "${clash.path}" already exists. Merging tags is not available yet.`);

      for (const t of renamed) {
        const res = await client.from('tags').update({ path: t.path }).eq('id', t.id);
        check(res.error, 'rename the tag');
      }
      // Rewrite #old in the notes that carry it.
      const ids = affected.map((t) => t.id);
      const { data: links, error } = await client.from('item_tags').select('item_id').in('tag_id', ids);
      check(error, 'find notes with this tag');
      const itemIds = [...new Set((links ?? []).map((l) => l.item_id))];
      for (const part of chunks(itemIds)) {
        const { data, error: e2 } = await client.from('items').select(ITEM_COLUMNS).in('id', part).eq('kind', 'note');
        check(e2, 'load notes');
        for (const note of (data ?? []).map(toItem)) {
          const body = renameTagInText(note.body ?? '', oldPath, target);
          if (body !== note.body) await api.saveNote(note.id, { title: note.title, body }, note.revision);
        }
      }
    },

    async setTagColor(tagId, color) {
      if (color !== null && !HEX.test(color)) throw new DataError('Colors are written as #RRGGBB.');
      const res = await client.from('tags').update({ color }).eq('id', tagId);
      check(res.error, 'save the tag color');
    },

    // ── Projects ─────────────────────────────────────────────────────────────
    async listProjects() {
      const rows = await fetchAll(
        (from, to) => client.from('projects').select('*').order('name').order('id').range(from, to),
        'load projects',
      );
      return rows.map(toProject);
    },

    async createProject(input) {
      const row = {
        user_id: await uid(),
        name: input.name.trim(),
        parent_id: input.parentId ?? null,
        description: input.description ?? null,
        ...(input.color ? { color: input.color } : {}),
      };
      return toProject(must(await client.from('projects').insert(row).select('*').single(), 'create the project'));
    },

    async updateProject(id, patch) {
      const row: Tables['projects']['Update'] = {};
      if (patch.name !== undefined) row.name = patch.name.trim();
      if (patch.parentId !== undefined) row.parent_id = patch.parentId;
      if (patch.description !== undefined) row.description = patch.description;
      if (patch.color !== undefined) row.color = patch.color;
      if (patch.archived !== undefined) row.archived = patch.archived;
      return toProject(must(await client.from('projects').update(row).eq('id', id).select('*').single(), 'save the project'));
    },

    async deleteProject(id) {
      const res = await client.from('projects').delete().eq('id', id);
      check(res.error, 'delete the project');
    },

    async listItemProjects() {
      const rows = await fetchAll(
        (from, to) =>
          client.from('item_projects').select('item_id, project_id').order('item_id').order('project_id').range(from, to),
        'load projects',
      );
      return rows.map((r) => ({ itemId: r.item_id, projectId: r.project_id }));
    },

    async setItemProjects(itemId, projectIds) {
      const wanted = new Set(projectIds);
      const { data, error } = await client.from('item_projects').select('project_id').eq('item_id', itemId);
      check(error, 'load the item\'s projects');
      const current = new Set((data ?? []).map((r) => r.project_id));
      const remove = [...current].filter((id) => !wanted.has(id));
      const add = [...wanted].filter((id) => !current.has(id));
      if (remove.length) check((await client.from('item_projects').delete().eq('item_id', itemId).in('project_id', remove)).error, 'remove from projects');
      if (add.length) check((await client.from('item_projects').insert(add.map((project_id) => ({ item_id: itemId, project_id })))).error, 'add to projects');
    },

    async addItemsToProject(itemIds, projectId) {
      for (const part of chunks(itemIds)) {
        const res = await client
          .from('item_projects')
          .upsert(part.map((item_id) => ({ item_id, project_id: projectId })), { onConflict: 'item_id,project_id', ignoreDuplicates: true });
        check(res.error, 'add to the project');
      }
    },

    // ── Links ────────────────────────────────────────────────────────────────
    async listLinks() {
      const rows = await fetchAll(
        (from, to) =>
          client
            .from('item_links')
            .select('from_item_id, to_item_id, origin')
            .order('from_item_id')
            .order('to_item_id')
            .order('origin')
            .range(from, to),
        'load links',
      );
      return rows.map((r) => ({ fromItemId: r.from_item_id, toItemId: r.to_item_id, origin: r.origin as 'manual' | 'text' }));
    },

    async addLink(fromItemId, toItemId) {
      const res = await client
        .from('item_links')
        .upsert({ from_item_id: fromItemId, to_item_id: toItemId, origin: 'manual' }, { onConflict: 'from_item_id,to_item_id,origin', ignoreDuplicates: true });
      check(res.error, 'add the link');
    },

    async removeLink(fromItemId, toItemId) {
      const res = await client
        .from('item_links')
        .delete()
        .eq('from_item_id', fromItemId)
        .eq('to_item_id', toItemId)
        .eq('origin', 'manual');
      check(res.error, 'remove the link');
    },

    // ── Annotations ──────────────────────────────────────────────────────────
    async listAnnotations(itemId) {
      const rows = await fetchAll((from, to) => {
        let q = client.from('annotations').select('*').is('deleted_at', null);
        if (itemId) q = q.eq('item_id', itemId);
        return q.order('created_at').order('id').range(from, to);
      }, 'load annotations');
      return rows.map(toAnnotation);
    },

    async createAnnotation(draft: AnnotationDraft) {
      const row: Tables['annotations']['Insert'] = {
        user_id: await uid(),
        item_id: draft.itemId,
        kind: draft.kind,
        color: draft.color,
        page: draft.page ?? null,
        position: draft.position ? asJson(draft.position) : null,
        quote: draft.quote ? asJson(draft.quote) : null,
        text: draft.text != null ? cleanText(draft.text) : null,
        locator: draft.locator ?? null,
      };
      return toAnnotation(must(await client.from('annotations').insert(row).select('*').single(), 'save the annotation'));
    },

    async updateAnnotation(id, patch: AnnotationPatch) {
      const row: Tables['annotations']['Update'] = {};
      if (patch.color !== undefined) row.color = patch.color;
      if (patch.position !== undefined) row.position = patch.position ? asJson(patch.position) : null;
      if (patch.locator !== undefined) row.locator = patch.locator;
      return toAnnotation(must(await client.from('annotations').update(row).eq('id', id).select('*').single(), 'save the annotation'));
    },

    async deleteAnnotation(id) {
      check((await client.from('annotations').update({ deleted_at: now() }).eq('id', id)).error, 'delete the annotation');
    },

    async restoreAnnotation(id) {
      check((await client.from('annotations').update({ deleted_at: null }).eq('id', id)).error, 'restore the annotation');
    },

    async listAnnotationTags() {
      const rows = await fetchAll(
        (from, to) =>
          client
            .from('annotation_tags_effective')
            .select('annotation_id, tag_id, inherited')
            .order('annotation_id')
            .order('tag_id')
            .range(from, to),
        'load annotation tags',
      );
      return rows
        .filter((r) => r.annotation_id && r.tag_id)
        .map((r) => ({ annotationId: r.annotation_id!, tagId: r.tag_id!, inherited: !!r.inherited }));
    },

    async setAnnotationTags(annotationId, paths) {
      await replaceTagLinks('annotation', annotationId, paths);
    },

    async attachNoteToAnnotations(noteId, annotationIds) {
      if (annotationIds.length) {
        const res = await client
          .from('note_annotations')
          .upsert(annotationIds.map((annotation_id) => ({ note_id: noteId, annotation_id })), {
            onConflict: 'note_id,annotation_id',
            ignoreDuplicates: true,
          });
        check(res.error, 'attach the note');
      }
      return api.listNoteAnnotations(noteId);
    },

    async listNoteAnnotations(noteId) {
      const { data, error } = await client.from('note_annotations').select('annotation_id').eq('note_id', noteId);
      check(error, 'load the note\'s highlights');
      return (data ?? []).map((r) => r.annotation_id);
    },

    // ── PDF text and search ──────────────────────────────────────────────────
    async savePageTexts(itemId, pages) {
      const rows = pages.map((text, i) => ({ item_id: itemId, page: i + 1, text: cleanText(text).slice(0, 200000) }));
      for (const part of chunks(rows, 50)) {
        const res = await client.from('item_pages').upsert(part, { onConflict: 'item_id,page' });
        check(res.error, 'save the PDF text');
      }
    },

    async search(query) {
      const q = query.trim();
      if (!q) return [];
      const { data, error } = await client.rpc('search_library', { q });
      check(error, 'search');
      return (data ?? []).map((h) => ({ itemId: h.item_id, page: h.page ?? null, rank: h.rank, snippet: h.snippet ?? '' }));
    },

    // ── Recently opened ──────────────────────────────────────────────────────
    async markOpened(itemId) {
      const res = await client
        .from('item_activity')
        .upsert({ user_id: await uid(), item_id: itemId, opened_at: now() }, { onConflict: 'user_id,item_id' });
      check(res.error, 'remember the opened item');
    },

    async listRecent(limit = 12) {
      const { data, error } = await client
        .from('item_activity')
        .select('item_id, opened_at')
        .order('opened_at', { ascending: false })
        .limit(limit);
      check(error, 'load recent items');
      return (data ?? []).map((r) => ({ itemId: r.item_id, openedAt: r.opened_at }));
    },
  };

  return api;
}
