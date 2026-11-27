'use client';

// The frame around every screen: top bar, left sidebar, and the main area.
// On phone-width screens the sidebar floats over the content.

import { Sidebar } from './Sidebar';
import { useShell } from './ShellProvider';
import { TopBar } from './TopBar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, narrow, toggleSidebar } = useShell();

  return (
    <div className="flex h-dvh flex-col bg-paper text-ink">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && (
          <>
            {narrow && (
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                onClick={toggleSidebar}
                className="fixed inset-0 top-12 z-30 bg-ink/20"
              />
            )}
            <aside
              className={
                narrow
                  ? 'fixed bottom-0 left-0 top-12 z-40 w-72 border-r border-dust shadow-xl'
                  : 'w-[268px] shrink-0 border-r border-dust'
              }
            >
              <Sidebar />
            </aside>
          </>
        )}
        <main className="min-h-0 min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
