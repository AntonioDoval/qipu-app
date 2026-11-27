import { beforeAll, describe, expect, it } from 'vitest';
import { createMemoryData } from '@/data/memory';
import type { Item, Project } from '@/data/types';
import {
  DEFAULT_QUERY,
  filterItems,
  nextSort,
  projectAndDescendants,
  quickMatch,
  sortItems,
  type LibraryFacts,
  type LibraryQuery,
} from './libraryQuery';

let items: Item[];
let facts: LibraryFacts;
let projects: Project[];

beforeAll(async () => {
  const data = createMemoryData();
  items = await data.listItems();
  projects = await data.listProjects();
  const tags = await data.listTags();
  const pathById = new Map(tags.map((t) => [t.id, t.path]));
  const tagPathsByItem = new Map<string, string[]>();
  for (const r of await data.listItemTags()) tagPathsByItem.set(r.itemId, [...(tagPathsByItem.get(r.itemId) ?? []), pathById.get(r.tagId)!]);
  const projectIdsByItem = new Map<string, Set<string>>();
  for (const r of await data.listItemProjects()) projectIdsByItem.set(r.itemId, new Set([...(projectIdsByItem.get(r.itemId) ?? []), r.projectId]));
  const annotationCount = new Map<string, number>();
  for (const a of await data.listAnnotations()) annotationCount.set(a.itemId, (annotationCount.get(a.itemId) ?? 0) + 1);
  const noteCount = new Map<string, number>();
  for (const n of items) if (n.anchorItemId) noteCount.set(n.anchorItemId, (noteCount.get(n.anchorItemId) ?? 0) + 1);
  facts = { tagPathsByItem, projectIdsByItem, projects, annotationCount, noteCount, fullTextHits: null };
});

const titles = (list: Item[]) => list.map((i) => i.title);
const query = (patch: Partial<LibraryQuery>): LibraryQuery => ({ ...DEFAULT_QUERY, ...patch });

describe('quick search', () => {
  it('matches title, authors and citekey, without accents, all words', () => {
    const argonauts = items.find((i) => i.title.startsWith('Argonauts'))!;
    expect(quickMatch(argonauts, 'malinowski 1922')).toBe(true); // citekey
    expect(quickMatch(argonauts, 'bronislaw')).toBe(true); // author, no accent
    expect(quickMatch(argonauts, 'argonauts pacific')).toBe(true);
    expect(quickMatch(argonauts, 'argonauts gift')).toBe(false);
  });
});

describe('filters', () => {
  it('filters by kind', () => {
    expect(filterItems(items, query({ kind: 'note' }), facts).every((i) => i.kind === 'note')).toBe(true);
    expect(filterItems(items, query({ kind: 'source' }), facts)).toHaveLength(3);
  });
  it('a project includes its subprojects', () => {
    const thesis = projects.find((p) => p.name === 'Thesis')!;
    expect(projectAndDescendants(projects, thesis.id).size).toBe(3);
    const inThesis = titles(filterItems(items, query({ projectId: thesis.id }), facts));
    expect(inThesis).toContain('Essai sur le don'); // in Ch. 1
    expect(inThesis).toContain('The Articulated Peasant'); // in Ch. 2
    expect(inThesis).not.toContain('The Mushroom at the End of the World'); // only in the seminar
  });
  it('a tag includes its child tags, and notes carry the tags written in them', () => {
    const exchange = titles(filterItems(items, query({ tag: 'exchange' }), facts));
    expect(exchange).toContain('Argonauts of the Western Pacific'); // exchange/kula
    expect(exchange).toContain('Kula as circulation, not exchange'); // note with #exchange/kula
    expect(exchange).not.toContain('The Articulated Peasant');
  });
  it('filters by what an item has', () => {
    expect(titles(filterItems(items, query({ has: ['annotations'] }), facts)).sort()).toEqual([
      'Argonauts of the Western Pacific',
      'Entrevista a Doña R., comerciante de papa',
    ]);
    expect(titles(filterItems(items, query({ has: ['notes'] }), facts))).toEqual(['Argonauts of the Western Pacific']);
    expect(filterItems(items, query({ has: ['pdf'] }), facts).every((i) => i.contentSource === 'drive_pdf')).toBe(true);
  });
  it('full-text mode shows only the items the search found', () => {
    const argonauts = items.find((i) => i.title.startsWith('Argonauts'))!;
    const hits = new Map([[argonauts.id, { itemId: argonauts.id, page: 81, rank: 1, snippet: 'The ⟦Kula⟧' }]]);
    expect(titles(filterItems(items, query({ fullText: 'kula' }), { ...facts, fullTextHits: hits }))).toEqual([argonauts.title]);
  });
});

describe('sorting', () => {
  it('defaults to newest created first', () => {
    const sorted = sortItems(items, DEFAULT_QUERY.sort);
    expect(sorted[0].createdAt >= sorted[1].createdAt).toBe(true);
  });
  it('sorts by first author surname, with items without authors last in both directions', () => {
    const asc = sortItems(items, { key: 'authors', dir: 'asc' });
    expect(asc[0].sortCreator).toBe('alberti');
    expect(asc.at(-1)!.sortCreator).toBe('');
    const desc = sortItems(items, { key: 'authors', dir: 'desc' });
    expect(desc.at(-1)!.sortCreator).toBe('');
  });
  it('clicking a header flips the direction, a new column starts sensibly', () => {
    expect(nextSort({ key: 'title', dir: 'asc' }, 'title')).toEqual({ key: 'title', dir: 'desc' });
    expect(nextSort({ key: 'title', dir: 'asc' }, 'modified')).toEqual({ key: 'modified', dir: 'desc' });
    expect(nextSort({ key: 'created', dir: 'desc' }, 'authors')).toEqual({ key: 'authors', dir: 'asc' });
  });
});
