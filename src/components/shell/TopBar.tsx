'use client';

// [◧] Qipu   (← Library  Malinowski, 1922)                                  [◨]
// The two toggles stay in the same place whether the panels are open or closed.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, PanelLeft, PanelRight } from 'lucide-react';
import { useLibrary } from '@/components/library/LibraryProvider';
import { shortLabel } from '@/lib/format';
import { useShortcutLabels } from '@/lib/shortcuts';
import { useShell } from './ShellProvider';

export function TopBar() {
  const t = useTranslations('shell');
  const { sidebarOpen, panelOpen, toggleSidebar, togglePanel } = useShell();
  const { itemById } = useLibrary();
  const keys = useShortcutLabels();
  const pathname = usePathname();
  const openId = pathname.startsWith('/item/') ? pathname.split('/')[2] : null;
  const openItem = openId ? itemById(openId) : undefined;

  return (
    <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-dust bg-cream px-3 md:px-4">
      <ToggleButton label={t('toggleSidebar', { keys: keys.toggleSidebar })} pressed={sidebarOpen} onClick={toggleSidebar}>
        <PanelLeft size={18} strokeWidth={1.7} />
      </ToggleButton>

      <Link
        href="/library"
        title={t('home')}
        className="rounded px-1.5 font-display text-[21px] font-semibold tracking-tight text-ink hover:text-accent"
      >
        Qipu
      </Link>

      {openId && (
        <div className="ml-4 flex min-w-0 items-center gap-2 md:ml-6">
          <Link
            href="/library"
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[13.5px] text-sage hover:bg-sand hover:text-ink"
          >
            <ArrowLeft size={15} strokeWidth={1.8} />
            {t('backToLibrary')}
          </Link>
          {openItem && (
            <span className="truncate text-[13.5px] text-ink" title={openItem.title}>
              {shortLabel(openItem)}
            </span>
          )}
        </div>
      )}

      <span className="flex-1" />

      <ToggleButton label={t('togglePanel', { keys: keys.togglePanel })} pressed={panelOpen} onClick={togglePanel}>
        <PanelRight size={18} strokeWidth={1.7} />
      </ToggleButton>
    </header>
  );
}

function ToggleButton(props: { label: string; pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.pressed}
      aria-label={props.label}
      title={props.label}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-sage hover:bg-sand hover:text-ink aria-pressed:text-accent"
    >
      {props.children}
    </button>
  );
}
