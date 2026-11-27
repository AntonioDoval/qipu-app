'use client';

// The library (step 3.1: frame and real data; list, search and filters come in 3.2).

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Inbox, Loader2 } from 'lucide-react';
import { KindIcon } from '@/components/shell/KindIcon';
import { ViewWithPanel } from '@/components/shell/ViewWithPanel';
import { useLibrary } from './LibraryProvider';

export function LibraryView() {
  const t = useTranslations('library');
  const tCommon = useTranslations('common');
  const { status, error, items, reload } = useLibrary();

  return (
    <ViewWithPanel panelLabel={t('title')} panel={<p className="text-[13px] italic text-sage">{t('selectHint')}</p>}>
      <div className="flex items-baseline gap-3 border-b border-dust px-5 py-3 md:px-6">
        <h1 className="font-display text-[21px] font-medium">{t('title')}</h1>
        {status === 'ready' && <span className="text-[13px] text-sage">{t('count', { count: items.length })}</span>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === 'loading' && (
          <p className="flex items-center gap-2 p-6 text-[13px] text-sage">
            <Loader2 size={15} className="animate-spin" /> {tCommon('loading')}
          </p>
        )}

        {status === 'error' && (
          <div className="m-6 rounded-lg border border-dust bg-surface p-4 text-[13.5px]">
            <p className="font-medium text-danger">{t('loadError')}</p>
            <p className="mt-1 font-mono text-[11.5px] text-sage">{error}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="mt-3 rounded-md border border-dust px-3 py-1 text-[13px] hover:border-stone"
            >
              {tCommon('retry')}
            </button>
          </div>
        )}

        {status === 'ready' && items.length === 0 && (
          <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 px-6 text-center">
            <Inbox size={36} strokeWidth={1.3} className="text-stone" />
            <h2 className="font-display text-[19px] font-medium">{t('emptyTitle')}</h2>
            <p className="text-[14px] text-sage">{t('emptyBody')}</p>
          </div>
        )}

        {status === 'ready' && items.length > 0 && (
          <ul className="divide-y divide-sand">
            {items.map((i) => (
              <li key={i.id}>
                <Link href={`/item/${i.id}`} className="flex items-center gap-3 px-6 py-2.5 hover:bg-softer">
                  <KindIcon kind={i.kind} />
                  <span className="truncate font-medium">{i.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ViewWithPanel>
  );
}
