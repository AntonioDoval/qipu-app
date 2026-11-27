'use client';

// The signed-in user's library, loaded once through the data layer and shared by the
// sidebar, the top bar and the views. It lives in the app layout, so it survives
// moving between the library and an open item.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getData, type Annotation, type Item, type ItemProject, type ItemTag, type Project, type Tag } from '@/data';
import type { LibraryFacts } from '@/lib/libraryQuery';

type Status = 'loading' | 'ready' | 'error';

interface LibraryState {
  status: Status;
  error: string | null;
  items: Item[];
  projects: Project[];
  tags: Tag[];
  itemTags: ItemTag[];
  itemProjects: ItemProject[];
  annotations: Annotation[];
  itemById: (id: string) => Item | undefined;
  /** Lookups the library list needs (tags, projects, counts per item). */
  facts: Omit<LibraryFacts, 'fullTextHits'>;
  reload: () => Promise<void>;
  /** Show a just-saved or just-created item right away, before the next full reload. */
  upsertItem: (item: Item) => void;
  /** Refresh only tags (e.g. after a note was saved with new #tags). */
  reloadTags: () => Promise<void>;
}

const LibraryContext = createContext<LibraryState | null>(null);

function group<K, V>(pairs: [K, V][]): Map<K, V[]> {
  const map = new Map<K, V[]>();
  for (const [k, v] of pairs) map.set(k, [...(map.get(k) ?? []), v]);
  return map;
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [itemTags, setItemTags] = useState<ItemTag[]>([]);
  const [itemProjects, setItemProjects] = useState<ItemProject[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const reload = useCallback(async () => {
    const data = getData();
    try {
      const [i, p, t, it, ip, an] = await Promise.all([
        data.listItems(),
        data.listProjects(),
        data.listTags(),
        data.listItemTags(),
        data.listItemProjects(),
        data.listAnnotations(),
      ]);
      setItems(i);
      setProjects(p);
      setTags(t);
      setItemTags(it);
      setItemProjects(ip);
      setAnnotations(an);
      setError(null);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, []);

  const upsertItem = useCallback((item: Item) => {
    setItems((list) => (list.some((i) => i.id === item.id) ? list.map((i) => (i.id === item.id ? item : i)) : [item, ...list]));
  }, []);

  const reloadTags = useCallback(async () => {
    const data = getData();
    const [t, it] = await Promise.all([data.listTags(), data.listItemTags()]);
    setTags(t);
    setItemTags(it);
  }, []);

  useEffect(() => {
    // Load the library once, when the app opens. The state only changes after the data
    // arrives (asynchronously), which is the intended use of an effect: fetching from outside.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const value = useMemo<LibraryState>(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    const pathById = new Map(tags.map((t) => [t.id, t.path]));
    const annotationCount = new Map<string, number>();
    for (const a of annotations) annotationCount.set(a.itemId, (annotationCount.get(a.itemId) ?? 0) + 1);
    const noteCount = new Map<string, number>();
    for (const n of items) if (n.anchorItemId) noteCount.set(n.anchorItemId, (noteCount.get(n.anchorItemId) ?? 0) + 1);
    const facts: LibraryState['facts'] = {
      tagPathsByItem: group(itemTags.map((r) => [r.itemId, pathById.get(r.tagId) ?? ''] as [string, string])),
      projectIdsByItem: new Map(
        [...group(itemProjects.map((r) => [r.itemId, r.projectId] as [string, string]))].map(([k, v]) => [k, new Set(v)]),
      ),
      projects,
      annotationCount,
      noteCount,
    };
    return {
      status,
      error,
      items,
      projects,
      tags,
      itemTags,
      itemProjects,
      annotations,
      itemById: (id) => byId.get(id),
      facts,
      reload,
      upsertItem,
      reloadTags,
    };
  }, [status, error, items, projects, tags, itemTags, itemProjects, annotations, reload, upsertItem, reloadTags]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryState {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
