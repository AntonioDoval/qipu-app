'use client';

// Temporary page for an opened item, until the reader (step 6) and the note editor (step 7) exist.

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLibrary } from '@/components/library/LibraryProvider';
import { KindIcon } from '@/components/shell/KindIcon';
import { ViewWithPanel } from '@/components/shell/ViewWithPanel';

export function ItemPlaceholder() {
  const t = useTranslations('item');
  const { id } = useParams<{ id: string }>();
  const { status, itemById } = useLibrary();
  const item = itemById(id);

  return (
    <ViewWithPanel panelLabel={t('details')} panel={null}>
      <div className="mx-auto mt-16 flex max-w-lg flex-col items-center gap-3 px-6 text-center">
        {item ? (
          <>
            <KindIcon kind={item.kind} size={28} />
            <h1 className="font-display text-[22px] font-medium">{item.title}</h1>
            <p className="text-[14px] text-sage">{t('comingSoon')}</p>
          </>
        ) : (
          status === 'ready' && <p className="text-[14px] text-sage">{t('notFound')}</p>
        )}
      </div>
    </ViewWithPanel>
  );
}
