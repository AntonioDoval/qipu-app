// Which items the library list shows, and in what order. Pure functions (no screen, no database),
// so the rules are tested on their own (libraryQuery.test.ts).

import type { Item, ItemKind, Project, SearchHit } from '@/data/types';
import { foldText } from './format';
import { isTagUnder } from './tags';

export type KindFilter = 'all' | ItemKind;
export type HasFilter = 'pdf' | 'annotations' | 'notes';
export type SortKey = 'kind' | 'title' | 'authors' | 'year' | 'created' | 'modified';
export type SortDir = 'asc' | 'desc';

export interface LibraryQuery {
  /** What is typed in the search bar. */
  text: string;
  /** Set when Enter was pressed: the text searched in full text (titles, authors, notes, PDF pages). */
  fullText: string | null;
  kind: KindFilter;
  projectId: string | null;
  tag: string | null;
  has: HasFilter[];
  sort: { key: SortKey; dir: SortDir };
}

export const DEFAULT_QUERY: LibraryQuery = {
  text: '',
  fullText: null,
  kind: 'all',
  projectId: null,
  tag: null,
  has: [],
  sort: { key: 'created', dir: 'desc' },
};

/** Everything the filters need besides the items themselves. */
export interface LibraryFacts {
  tagPathsByItem: Map<string, string[]>;
  projectIdsByItem: Map<string, Set<string>>;
  projects: Project[];
  annotationCount: Map<string, number>;
  /** Notes attached to each text (notes whose anchor is that item). */
  noteCount: Map<string, number>;
  /** Full-text results for `query.fullText`, best hit per item (null while not searching in full text). */
  fullTextHits: Map<string, SearchHit> | null;
}

/** The project and all projects nested inside it. */
export function projectAndDescendants(projects: Project[], projectId: string): Set<string> {
  const ids = new Set([projectId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of projects) {
      if (p.parentId && ids.has(p.parentId) && !ids.has(p.id)) {
        ids.add(p.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** Instant search: title, authors and citekey, without accents, every word must appear. */
export function quickMatch(item: Item, text: string): boolean {
  const words = foldText(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = foldText(`${item.title} ${item.creatorsText} ${item.citekey ?? ''}`);
  return words.every((w) => haystack.includes(w));
}

export function filterItems(items: Item[], q: LibraryQuery, facts: LibraryFacts): Item[] {
  const inProject = q.projectId ? projectAndDescendants(facts.projects, q.projectId) : null;
  return items.filter((item) => {
    if (q.kind !== 'all' && item.kind !== q.kind) return false;
    if (inProject && ![...(facts.projectIdsByItem.get(item.id) ?? [])].some((p) => inProject.has(p))) return false;
    if (q.tag && !(facts.tagPathsByItem.get(item.id) ?? []).some((path) => isTagUnder(path, q.tag!))) return false;
    for (const h of q.has) {
      if (h === 'pdf' && item.contentSource !== 'drive_pdf') return false;
      if (h === 'annotations' && !facts.annotationCount.get(item.id)) return false;
      if (h === 'notes' && !facts.noteCount.get(item.id)) return false;
    }
    if (q.fullText) return facts.fullTextHits?.has(item.id) ?? false;
    return quickMatch(item, q.text);
  });
}

const KIND_ORDER: Record<ItemKind, number> = { bibliography: 0, source: 1, note: 2 };

function compare(a: Item, b: Item, key: SortKey): number {
  switch (key) {
    case 'title':
      return foldText(a.title).localeCompare(foldText(b.title));
    case 'authors':
      // Items without authors go last whatever the direction is handled by sortItems.
      return a.sortCreator.localeCompare(b.sortCreator);
    case 'year':
      return (a.year ?? 0) - (b.year ?? 0);
    case 'created':
      return a.createdAt.localeCompare(b.createdAt);
    case 'modified':
      return a.updatedAt.localeCompare(b.updatedAt);
    case 'kind':
      return KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.type.localeCompare(b.type);
  }
}

/** Sort by one column; empty authors/years always go last; ties are broken by title. */
export function sortItems(items: Item[], sort: LibraryQuery['sort']): Item[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  const isEmpty = (i: Item) =>
    (sort.key === 'authors' && !i.sortCreator) || (sort.key === 'year' && i.year == null);
  return [...items].sort((a, b) => {
    const ea = isEmpty(a);
    const eb = isEmpty(b);
    if (ea !== eb) return ea ? 1 : -1;
    return sign * compare(a, b, sort.key) || foldText(a.title).localeCompare(foldText(b.title));
  });
}

/** Clicking a column header: same column flips the direction; a new column starts with its natural direction. */
export function nextSort(current: LibraryQuery['sort'], key: SortKey): LibraryQuery['sort'] {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  const newestFirst = key === 'created' || key === 'modified' || key === 'year';
  return { key, dir: newestFirst ? 'desc' : 'asc' };
}
