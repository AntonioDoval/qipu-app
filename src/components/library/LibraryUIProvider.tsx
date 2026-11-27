'use client';

// What the library is showing: search, filters, sorting, selection, scroll position, trash.
// Kept in the app layout, so opening an item and coming back finds the library as it was.
// Sorting and visible columns are also remembered in this browser.

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { getData, type Item, type SearchHit } from '@/data';
import { DEFAULT_QUERY, nextSort, type HasFilter, type KindFilter, type LibraryQuery, type SortKey } from '@/lib/libraryQuery';
import { useStored } from '@/lib/useStored';

export const ALL_COLUMNS = ['kind', 'title', 'authors', 'year', 'created', 'modified', 'tags', 'has'] as const;
export type Column = (typeof ALL_COLUMNS)[number];

type SearchStatus = 'idle' | 'searching' | 'done' | 'error';

interface LibraryUI {
  query: LibraryQuery;
  setText: (text: string) => void;
  /** Enter in the search bar: search the full text (titles, authors, notes, PDF pages). */
  runFullText: () => Promise<void>;
  clearFullText: () => void;
  fullTextHits: Map<string, SearchHit> | null;
  searchStatus: SearchStatus;
  setKind: (kind: KindFilter) => void;
  setProject: (projectId: string | null) => void;
  setTag: (tag: string | null) => void;
  toggleHas: (has: HasFilter) => void;
  clearFilters: () => void;
  /** The Qipu logo: everything back to the start. */
  resetAll: () => void;
  sortBy: (key: SortKey) => void;
  columns: Column[];
  toggleColumn: (column: Column) => void;
  selectedId: string | null;
  select: (id: string | null) => void;
  /** Trash view. */
  trash: boolean;
  trashItems: Item[];
  showTrash: () => Promise<void>;
  /** Scroll position of the list, restored when coming back. */
  savedScroll: () => number;
  rememberScroll: (top: number) => void;
}

const LibraryUIContext = createContext<LibraryUI | null>(null);

export function LibraryUIProvider({ children }: { children: React.ReactNode }) {
  const [sort, setSort] = useStored<LibraryQuery['sort']>('qipu.library.sort', DEFAULT_QUERY.sort);
  const [columns, setColumns] = useStored<Column[]>('qipu.library.columns', [...ALL_COLUMNS]);
  const [filters, setFilters] = useState<Omit<LibraryQuery, 'sort'>>(DEFAULT_QUERY);
  const [fullTextHits, setHits] = useState<Map<string, SearchHit> | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trash, setTrash] = useState(false);
  const [trashItems, setTrashItems] = useState<Item[]>([]);
  const scrollTop = useRef(0);

  const leaveTrash = useCallback(() => setTrash(false), []);
  const savedScroll = useCallback(() => scrollTop.current, []);
  const rememberScroll = useCallback((top: number) => {
    scrollTop.current = top;
  }, []);

  const setText = useCallback((text: string) => {
    // Typing again goes back to the instant title/author search.
    setFilters((f) => ({ ...f, text, fullText: null }));
    setHits(null);
    setSearchStatus('idle');
  }, []);

  const runFullText = useCallback(async () => {
    const text = filters.text.trim();
    if (!text) return;
    setFilters((f) => ({ ...f, fullText: text }));
    setSearchStatus('searching');
    try {
      const hits = await getData().search(text);
      const best = new Map<string, SearchHit>();
      for (const h of hits) if (!best.has(h.itemId) || h.rank > best.get(h.itemId)!.rank) best.set(h.itemId, h);
      setHits(best);
      setSearchStatus('done');
    } catch {
      setHits(new Map());
      setSearchStatus('error');
    }
  }, [filters.text]);

  const clearFullText = useCallback(() => {
    setFilters((f) => ({ ...f, text: '', fullText: null }));
    setHits(null);
    setSearchStatus('idle');
  }, []);

  const value = useMemo<LibraryUI>(
    () => ({
      query: { ...filters, sort },
      setText,
      runFullText,
      clearFullText,
      fullTextHits,
      searchStatus,
      setKind: (kind) => {
        leaveTrash();
        setFilters((f) => ({ ...f, kind }));
      },
      setProject: (projectId) => {
        leaveTrash();
        setFilters((f) => ({ ...f, projectId }));
      },
      setTag: (tag) => {
        leaveTrash();
        setFilters((f) => ({ ...f, tag }));
      },
      toggleHas: (h) =>
        setFilters((f) => ({ ...f, has: f.has.includes(h) ? f.has.filter((x) => x !== h) : [...f.has, h] })),
      clearFilters: () => setFilters((f) => ({ ...f, projectId: null, tag: null, has: [] })),
      resetAll: () => {
        leaveTrash();
        setFilters(DEFAULT_QUERY);
        setHits(null);
        setSearchStatus('idle');
        scrollTop.current = 0;
      },
      sortBy: (key) => setSort(nextSort(sort, key)),
      columns,
      toggleColumn: (column) =>
        setColumns(
          columns.includes(column)
            ? columns.filter((c) => c !== column)
            : ALL_COLUMNS.filter((c) => c === column || columns.includes(c)),
        ),
      selectedId,
      select: setSelectedId,
      trash,
      trashItems,
      showTrash: async () => {
        setTrash(true);
        setTrashItems(await getData().listItems({ trash: true }));
      },
      savedScroll,
      rememberScroll,
    }),
    [filters, sort, setText, runFullText, clearFullText, fullTextHits, searchStatus, leaveTrash, setSort, columns, setColumns, selectedId, trash, trashItems, savedScroll, rememberScroll],
  );

  return <LibraryUIContext.Provider value={value}>{children}</LibraryUIContext.Provider>;
}

export function useLibraryUI(): LibraryUI {
  const ctx = useContext(LibraryUIContext);
  if (!ctx) throw new Error('useLibraryUI must be used inside <LibraryUIProvider>');
  return ctx;
}
