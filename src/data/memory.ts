// An in-memory implementation of QipuData, filled with the sample library.
// Used only for local previews (`npm run preview:sample`) and automatic tests: nothing is saved.
// It follows the same contract as the Supabase version (and a future offline version would).

import { foldText } from '@/lib/format';
import { parseNoteLinks, parseNoteTags, renameLinks, renameTagInText } from '@/lib/notes';
import { isTagUnder, normalizeTagPath } from '@/lib/tags';
import { citekeyBase, deriveFromCsl, nextCitekey } from './derive';
import type { QipuData } from './repository';
import { SAMPLE_ANCHORS, SAMPLE_ANNOTATIONS, SAMPLE_ITEMS, SAMPLE_PROJECTS } from './sample';
import {
  ConflictError,
  DataError,
  type Annotation,
  type AnnotationTag,
  type Item,
  type ItemDraft,
  type ItemLink,
  type ItemProject,
  type ItemTag,
  type NoteVersion,
  type PaletteSlot,
  type Profile,
  type Project,
  type RecentItem,
  type SearchHit,
  type Tag,
} from './types';

const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
let counter = 0;
const newId = () => `mem-${(++counter).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createMemoryData(options: { sample?: boolean } = { sample: true }): QipuData {
  const profile: Profile = {
    id: 'memory-user',
    email: 'preview@example.com',
    fullName: 'Preview',
    avatarUrl: null,
    locale: 'es',
    palette: ['#F0E442', '#009E73', '#CC79A7', '#56B4E9', '#E69F00'].map((color) => ({ color, name: null })),
    sourceTypes: [],
  };
  let items: Item[] = [];
  let projects: Project[] = [];
  let tags: Tag[] = [];
  let itemTags: ItemTag[] = [];
  let itemProjects: ItemProject[] = [];
  let links: ItemLink[] = [];
  let annotations: Annotation[] = [];
  let annotationTags: { annotationId: string; tagId: string }[] = [];
  let noteAnnotations: { noteId: string; annotationId: string }[] = [];
  const versions: NoteVersion[] = [];
  const activity = new Map<string, string>();
  const pages = new Map<string, string[]>();

  // ── helpers ─────────────────────────────────────────────────────────────────
  const get = (id: string) => items.find((i) => i.id === id);

  function build(draft: ItemDraft, createdAt: string): Item {
    const csl = draft.csl ?? {};
    const derived = deriveFromCsl(csl);
    const taken = new Set(items.map((i) => i.citekey).filter((k): k is string => !!k));
    return {
      id: newId(),
      kind: draft.kind,
      type: draft.type,
      title: draft.title.trim(),
      citekey:
        draft.kind === 'bibliography'
          ? draft.citekey ?? nextCitekey(citekeyBase(csl, draft.title, derived.year), taken)
          : null,
      csl,
      metadata: draft.metadata ?? {},
      body: draft.body ?? null,
      contentSource: draft.contentSource ?? 'none',
      drive: draft.drive ?? null,
      pageCount: draft.pageCount ?? null,
      hasTextLayer: draft.hasTextLayer ?? null,
      anchorItemId: draft.anchorItemId ?? null,
      ...derived,
      revision: 1,
      deletedAt: null,
      createdAt,
      updatedAt: createdAt,
    };
  }

  function touch(item: Item, patch: Partial<Item>): Item {
    const next = { ...item, ...patch, revision: item.revision + 1, updatedAt: new Date().toISOString() };
    if (patch.csl) Object.assign(next, deriveFromCsl(patch.csl));
    items = items.map((i) => (i.id === item.id ? next : i));
    return next;
  }

  function ensureTags(paths: string[]): Tag[] {
    return paths.map((p) => {
      const path = normalizeTagPath(p);
      if (!path) throw new DataError(`"${p}" is not a valid tag.`);
      const found = tags.find((t) => t.path.toLowerCase() === path.toLowerCase());
      if (found) return found;
      const tag = { id: newId(), path, color: null };
      tags = [...tags, tag];
      return tag;
    });
  }

  function syncNote(note: Item) {
    const wanted = ensureTags(parseNoteTags(note.body ?? '')).map((t) => t.id);
    itemTags = [...itemTags.filter((r) => r.itemId !== note.id), ...wanted.map((tagId) => ({ itemId: note.id, tagId }))];
    const live = items.filter((i) => !i.deletedAt && i.id !== note.id);
    const targets = parseNoteLinks(note.body ?? '')
      .map((title) => live.find((i) => foldText(i.title) === foldText(title))?.id)
      .filter((id): id is string => !!id);
    links = [
      ...links.filter((l) => !(l.fromItemId === note.id && l.origin === 'text')),
      ...[...new Set(targets)].map((toItemId) => ({ fromItemId: note.id, toItemId, origin: 'text' as const })),
    ];
  }

  // ── sample library ──────────────────────────────────────────────────────────
  if (options.sample) {
    const projectIds = new Map<string, string>();
    for (const p of SAMPLE_PROJECTS) {
      const id = newId();
      projectIds.set(p.key, id);
      projects.push({
        id,
        parentId: p.parent ? projectIds.get(p.parent)! : null,
        name: p.name,
        description: null,
        color: p.color,
        archived: false,
        createdAt: iso(60 * DAY),
        updatedAt: iso(60 * DAY),
      });
    }
    const itemIds = new Map<string, string>();
    for (const s of SAMPLE_ITEMS) {
      const item = build(s, iso(s.daysAgo * DAY));
      item.updatedAt = iso((s.modifiedDaysAgo ?? s.daysAgo) * DAY);
      items.push(item);
      itemIds.set(s.key, item.id);
      for (const t of ensureTags(s.tags ?? [])) itemTags.push({ itemId: item.id, tagId: t.id });
      for (const p of s.projects ?? []) itemProjects.push({ itemId: item.id, projectId: projectIds.get(p)! });
    }
    for (const [note, target] of Object.entries(SAMPLE_ANCHORS)) {
      const n = items.find((i) => i.id === itemIds.get(note));
      if (n) n.anchorItemId = itemIds.get(target) ?? null;
    }
    for (const n of items.filter((i) => i.kind === 'note')) syncNote(n);
    for (const a of SAMPLE_ANNOTATIONS) {
      const now = iso(5 * DAY);
      annotations.push({
        id: newId(),
        itemId: itemIds.get(a.item)!,
        kind: a.kind,
        color: a.color,
        page: a.page ?? null,
        position: a.position ?? null,
        quote: a.quote ?? null,
        text: a.text ?? null,
        locator: a.locator ?? null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    activity.set(itemIds.get('malinowski')!, iso(0.05 * DAY));
    activity.set(itemIds.get('rosa')!, iso(0.2 * DAY));
  }

  const later = <T>(value: T) => Promise.resolve(structuredClone(value));

  // ── the contract ────────────────────────────────────────────────────────────
  const api: QipuData = {
    getProfile: () => later(profile),
    async updatePalette(palette: PaletteSlot[]) {
      profile.palette = palette;
    },
    async addSourceType(label) {
      if (!profile.sourceTypes.some((t) => foldText(t) === foldText(label))) profile.sourceTypes.push(label.trim());
    },

    listItems: (o) => later(items.filter((i) => (o?.trash ? !!i.deletedAt : !i.deletedAt))),
    getItem: (id) => later(get(id) ?? null),
    async createItem(draft) {
      const item = build(draft, new Date().toISOString());
      items = [item, ...items];
      if (item.kind === 'note') syncNote(item);
      return structuredClone(item);
    },
    async updateItem(id, patch, expectedRevision) {
      const item = get(id);
      if (!item) throw new DataError('Item not found.');
      if (expectedRevision !== undefined && item.revision !== expectedRevision) throw new ConflictError(id);
      return structuredClone(touch(item, patch as Partial<Item>));
    },
    async renameItem(id, title) {
      const item = get(id);
      if (!item) throw new DataError('Item not found.');
      const renamed = touch(item, { title: title.trim() });
      for (const l of links.filter((x) => x.toItemId === id && x.origin === 'text')) {
        const note = get(l.fromItemId);
        if (note?.body) {
          const body = renameLinks(note.body, item.title, renamed.title);
          if (body !== note.body) syncNote(touch(note, { body }));
        }
      }
      return structuredClone(renamed);
    },
    async trashItems(ids) {
      items = items.map((i) => (ids.includes(i.id) ? { ...i, deletedAt: new Date().toISOString() } : i));
    },
    async restoreItems(ids) {
      items = items.map((i) => (ids.includes(i.id) ? { ...i, deletedAt: null } : i));
    },

    async saveNote(id, content, expectedRevision) {
      const note = get(id);
      if (!note || note.kind !== 'note' || note.revision !== expectedRevision) throw new ConflictError(id);
      versions.unshift({ id: newId(), noteId: id, title: note.title, body: note.body, savedAt: note.updatedAt });
      const saved = touch(note, { title: content.title.trim() || 'Untitled', body: content.body });
      syncNote(saved);
      return structuredClone(saved);
    },
    listNoteVersions: (noteId) => later(versions.filter((v) => v.noteId === noteId)),

    listTags: () => later([...tags].sort((a, b) => a.path.localeCompare(b.path))),
    listItemTags: () => later(itemTags),
    async setItemTags(itemId, paths) {
      const wanted = ensureTags(paths).map((t) => t.id);
      itemTags = [...itemTags.filter((r) => r.itemId !== itemId), ...wanted.map((tagId) => ({ itemId, tagId }))];
    },
    async addTagToItems(itemIds, path) {
      const [tag] = ensureTags([path]);
      for (const id of itemIds) {
        const item = get(id);
        if (item?.kind === 'note') {
          if (!parseNoteTags(item.body ?? '').some((t) => t.toLowerCase() === tag.path.toLowerCase())) {
            syncNote(touch(item, { body: `${(item.body ?? '').trimEnd()}\n\n#${tag.path}` }));
          }
        } else if (!itemTags.some((r) => r.itemId === id && r.tagId === tag.id)) {
          itemTags = [...itemTags, { itemId: id, tagId: tag.id }];
        }
      }
    },
    async renameTag(oldPath, newPath) {
      const target = normalizeTagPath(newPath);
      if (!target) throw new DataError(`"${newPath}" is not a valid tag.`);
      tags = tags.map((t) => (isTagUnder(t.path, oldPath) ? { ...t, path: target + t.path.slice(oldPath.length) } : t));
      for (const note of items.filter((i) => i.kind === 'note' && i.body)) {
        const body = renameTagInText(note.body!, oldPath, target);
        if (body !== note.body) syncNote(touch(note, { body }));
      }
    },
    async setTagColor(tagId, color) {
      tags = tags.map((t) => (t.id === tagId ? { ...t, color } : t));
    },

    listProjects: () => later([...projects].sort((a, b) => a.name.localeCompare(b.name))),
    async createProject(input) {
      const now = new Date().toISOString();
      const p: Project = {
        id: newId(),
        parentId: input.parentId ?? null,
        name: input.name.trim(),
        description: input.description ?? null,
        color: input.color ?? '#a89b85',
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      projects = [...projects, p];
      return structuredClone(p);
    },
    async updateProject(id, patch) {
      projects = projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p));
      return structuredClone(projects.find((p) => p.id === id)!);
    },
    async deleteProject(id) {
      projects = projects.filter((p) => p.id !== id).map((p) => (p.parentId === id ? { ...p, parentId: null } : p));
      itemProjects = itemProjects.filter((r) => r.projectId !== id);
    },
    listItemProjects: () => later(itemProjects),
    async setItemProjects(itemId, projectIds) {
      itemProjects = [...itemProjects.filter((r) => r.itemId !== itemId), ...projectIds.map((projectId) => ({ itemId, projectId }))];
    },
    async addItemsToProject(itemIds, projectId) {
      for (const itemId of itemIds) {
        if (!itemProjects.some((r) => r.itemId === itemId && r.projectId === projectId)) itemProjects = [...itemProjects, { itemId, projectId }];
      }
    },

    listLinks: () => later(links),
    async addLink(fromItemId, toItemId) {
      if (!links.some((l) => l.fromItemId === fromItemId && l.toItemId === toItemId && l.origin === 'manual')) {
        links = [...links, { fromItemId, toItemId, origin: 'manual' }];
      }
    },
    async removeLink(fromItemId, toItemId) {
      links = links.filter((l) => !(l.fromItemId === fromItemId && l.toItemId === toItemId && l.origin === 'manual'));
    },

    listAnnotations: (itemId) => later(annotations.filter((a) => !a.deletedAt && (!itemId || a.itemId === itemId))),
    async createAnnotation(draft) {
      const now = new Date().toISOString();
      const a: Annotation = {
        id: newId(),
        itemId: draft.itemId,
        kind: draft.kind,
        color: draft.color,
        page: draft.page ?? null,
        position: draft.position ?? null,
        quote: draft.quote ?? null,
        text: draft.text ?? null,
        locator: draft.locator ?? null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      annotations = [...annotations, a];
      return structuredClone(a);
    },
    async updateAnnotation(id, patch) {
      annotations = annotations.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a));
      return structuredClone(annotations.find((a) => a.id === id)!);
    },
    async deleteAnnotation(id) {
      annotations = annotations.map((a) => (a.id === id ? { ...a, deletedAt: new Date().toISOString() } : a));
    },
    async restoreAnnotation(id) {
      annotations = annotations.map((a) => (a.id === id ? { ...a, deletedAt: null } : a));
    },
    async listAnnotationTags() {
      const own: AnnotationTag[] = annotationTags.map((r) => ({ ...r, inherited: false }));
      const inherited: AnnotationTag[] = annotations.flatMap((a) =>
        itemTags
          .filter((r) => r.itemId === a.itemId && !annotationTags.some((x) => x.annotationId === a.id && x.tagId === r.tagId))
          .map((r) => ({ annotationId: a.id, tagId: r.tagId, inherited: true })),
      );
      return structuredClone([...own, ...inherited]);
    },
    async setAnnotationTags(annotationId, paths) {
      const wanted = ensureTags(paths).map((t) => t.id);
      annotationTags = [...annotationTags.filter((r) => r.annotationId !== annotationId), ...wanted.map((tagId) => ({ annotationId, tagId }))];
    },
    async attachNoteToAnnotations(noteId, annotationIds) {
      for (const annotationId of annotationIds) {
        if (!noteAnnotations.some((r) => r.noteId === noteId && r.annotationId === annotationId)) {
          noteAnnotations = [...noteAnnotations, { noteId, annotationId }];
        }
      }
      return noteAnnotations.filter((r) => r.noteId === noteId).map((r) => r.annotationId);
    },
    listNoteAnnotations: (noteId) => later(noteAnnotations.filter((r) => r.noteId === noteId).map((r) => r.annotationId)),

    async savePageTexts(itemId, texts) {
      pages.set(itemId, texts);
    },
    async search(query) {
      const q = foldText(query);
      if (!q) return [];
      const words = q.split(/\s+/).filter(Boolean);
      const hit = (text: string) => words.every((w) => foldText(text).includes(w));
      // Mark every word whose accent-free form contains a searched word (like the database's ⟦ ⟧).
      const snippet = (text: string) => {
        const tokens = text.replace(/\s+/g, ' ').split(/(\s+)/);
        const first = tokens.findIndex((tok) => words.some((w) => foldText(tok).includes(w)));
        const from = Math.max(0, first - 12);
        const piece = tokens.slice(from, from + 40).map((tok) => (words.some((w) => foldText(tok).includes(w)) ? `⟦${tok}⟧` : tok));
        return (from ? '…' : '') + piece.join('');
      };
      const results = items
        .filter((i) => !i.deletedAt && hit(`${i.title} ${i.creatorsText} ${i.citekey ?? ''} ${i.body ?? ''}`))
        .map((i): SearchHit => ({ itemId: i.id, page: null, rank: 1, snippet: snippet(i.body && hit(i.body) ? i.body : i.title) }));
      for (const [itemId, texts] of pages) {
        texts.forEach((text, k) => {
          if (hit(text)) results.push({ itemId, page: k + 1, rank: 0.5, snippet: snippet(text) });
        });
      }
      return results;
    },

    async markOpened(itemId) {
      activity.set(itemId, new Date().toISOString());
    },
    async listRecent(limit = 12) {
      const list: RecentItem[] = [...activity.entries()].map(([itemId, openedAt]) => ({ itemId, openedAt }));
      return list.sort((a, b) => b.openedAt.localeCompare(a.openedAt)).slice(0, limit);
    },
  };

  return api;
}
