'use client';

// The signed-in user's library, loaded once through the data layer and shared by the
// sidebar, the top bar and the views. It lives in the app layout, so it survives
// moving between the library and an open item.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getData, type Item, type ItemProject, type ItemTag, type Project, type Tag } from '@/data';

type Status = 'loading' | 'ready' | 'error';

interface LibraryState {
  status: Status;
  error: string | null;
  items: Item[];
  projects: Project[];
  tags: Tag[];
  itemTags: ItemTag[];
  itemProjects: ItemProject[];
  itemById: (id: string) => Item | undefined;
  reload: () => Promise<void>;
}

const LibraryContext = createContext<LibraryState | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [itemTags, setItemTags] = useState<ItemTag[]>([]);
  const [itemProjects, setItemProjects] = useState<ItemProject[]>([]);

  const reload = useCallback(async () => {
    const data = getData();
    try {
      const [i, p, t, it, ip] = await Promise.all([
        data.listItems(),
        data.listProjects(),
        data.listTags(),
        data.listItemTags(),
        data.listItemProjects(),
      ]);
      setItems(i);
      setProjects(p);
      setTags(t);
      setItemTags(it);
      setItemProjects(ip);
      setError(null);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // Load the library once, when the app opens. The state only changes after the data
    // arrives (asynchronously), which is the intended use of an effect: fetching from outside.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const value = useMemo<LibraryState>(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    return {
      status,
      error,
      items,
      projects,
      tags,
      itemTags,
      itemProjects,
      itemById: (id) => byId.get(id),
      reload,
    };
  }, [status, error, items, projects, tags, itemTags, itemProjects, reload]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryState {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
