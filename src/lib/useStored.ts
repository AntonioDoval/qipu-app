'use client';

// A small setting remembered in this browser (localStorage), e.g. which panels are open.
// Uses React's useSyncExternalStore, so the server render and the first browser render match,
// and every component reading the same key stays in sync. If storage is blocked (private
// window), it still works for the current visit from memory.

import { useCallback, useMemo, useSyncExternalStore } from 'react';

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

export function useStored<T>(key: string, fallback: T): [T, (value: T) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null, // on the server: nothing stored
  );
  const value = useMemo(() => {
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
    // `fallback` is a constant at each call site; re-parsing only when the stored text changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  const set = useCallback(
    (next: T) => {
      const text = JSON.stringify(next);
      memory.set(key, text);
      try {
        localStorage.setItem(key, text);
      } catch {
        // blocked: kept in memory for this visit
      }
      listeners.forEach((l) => l());
    },
    [key],
  );

  return [value, set];
}

const NO_SUBSCRIBE = () => () => {};

/** True when the CSS media query matches (false on the server). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    typeof window === 'undefined' ? NO_SUBSCRIBE : subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
