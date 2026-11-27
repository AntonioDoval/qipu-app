'use client';

// Which side panels are open, shared by every screen. Remembered in this browser,
// toggled with ⌃⌘S (sidebar) and ⌃⌘I (right panel); see lib/shortcuts.ts.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { shortcutFor } from '@/lib/shortcuts';
import { useMediaQuery, useStored } from '@/lib/useStored';

interface ShellState {
  sidebarOpen: boolean;
  panelOpen: boolean;
  /** Phone-width screen: the sidebar floats over the content instead of pushing it. */
  narrow: boolean;
  toggleSidebar: () => void;
  togglePanel: () => void;
  closeSidebarIfNarrow: () => void;
}

const ShellContext = createContext<ShellState | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const narrow = useMediaQuery('(max-width: 767px)');
  const [wideSidebarOpen, setWideSidebarOpen] = useStored('qipu.shell.sidebar', true);
  const [panelOpen, setPanelOpen] = useStored('qipu.shell.panel', true);
  // On a phone the sidebar starts closed every time and is not remembered.
  const [phoneSidebarOpen, setPhoneSidebarOpen] = useState(false);
  const sidebarOpen = narrow ? phoneSidebarOpen : wideSidebarOpen;

  const toggleSidebar = useCallback(() => {
    if (narrow) setPhoneSidebarOpen((o) => !o);
    else setWideSidebarOpen(!wideSidebarOpen);
  }, [narrow, wideSidebarOpen, setWideSidebarOpen]);

  const togglePanel = useCallback(() => setPanelOpen(!panelOpen), [panelOpen, setPanelOpen]);

  const closeSidebarIfNarrow = useCallback(() => {
    if (narrow) setPhoneSidebarOpen(false);
  }, [narrow]);

  // ⌃⌘S / ⌃⌘I (Ctrl+Alt+S / Ctrl+Alt+I): letters, so they work on any keyboard layout.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = shortcutFor(e);
      if (!action) return;
      e.preventDefault();
      if (action === 'toggleSidebar') toggleSidebar();
      else togglePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar, togglePanel]);

  const value = useMemo(
    () => ({ sidebarOpen, panelOpen, narrow, toggleSidebar, togglePanel, closeSidebarIfNarrow }),
    [sidebarOpen, panelOpen, narrow, toggleSidebar, togglePanel, closeSidebarIfNarrow],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used inside <ShellProvider>');
  return ctx;
}
