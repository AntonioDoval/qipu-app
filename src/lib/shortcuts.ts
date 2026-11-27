'use client';

// Panel shortcuts that work on any keyboard layout (letters, matched by physical key):
//   Mac: ⌃⌘S sidebar · ⌃⌘I right panel     Windows/Linux: Ctrl+Alt+S · Ctrl+Alt+I
// Same idea as Finder, Mail and Notes (⌃⌘S shows or hides the sidebar).

import { useSyncExternalStore } from 'react';

export type ShortcutAction = 'toggleSidebar' | 'togglePanel';

const KEYS: Record<string, ShortcutAction> = { KeyS: 'toggleSidebar', KeyI: 'togglePanel' };

export function shortcutFor(e: KeyboardEvent): ShortcutAction | null {
  const mac = e.metaKey && e.ctrlKey && !e.altKey;
  const other = e.ctrlKey && e.altKey && !e.metaKey;
  if (!mac && !other) return null;
  return KEYS[e.code] ?? null;
}

const noSubscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Labels to show in tooltips and Settings, for this computer. */
export function useShortcutLabels(): Record<ShortcutAction, string> {
  const mac = useSyncExternalStore(noSubscribe, isMac, () => true);
  return mac
    ? { toggleSidebar: '⌃⌘S', togglePanel: '⌃⌘I' }
    : { toggleSidebar: 'Ctrl+Alt+S', togglePanel: 'Ctrl+Alt+I' };
}
