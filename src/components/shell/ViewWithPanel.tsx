'use client';

// A screen's main content plus its right panel, which the top-bar button shows or hides.
// On phone-width screens the panel goes below the content.

import { useShell } from './ShellProvider';

export function ViewWithPanel(props: { children: React.ReactNode; panel: React.ReactNode; panelLabel: string }) {
  const { panelOpen, narrow } = useShell();
  return (
    <div className={narrow ? 'h-full overflow-y-auto' : 'flex h-full min-h-0'}>
      <div className={narrow ? '' : 'flex min-h-0 min-w-0 flex-1 flex-col'}>{props.children}</div>
      {panelOpen && (
        <aside
          aria-label={props.panelLabel}
          className={
            narrow
              ? 'border-t border-dust bg-paper p-4'
              : 'w-[330px] shrink-0 overflow-y-auto border-l border-dust bg-paper p-5'
          }
        >
          {props.panel}
        </aside>
      )}
    </div>
  );
}
