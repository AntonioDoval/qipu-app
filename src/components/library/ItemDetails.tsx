'use client';

// Right panel of the library: details of the selected item.

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { RotateCcw } from 'lucide-react';
import { getData, type CslName, type Item } from '@/data';
import { KindIcon } from '@/components/shell/KindIcon';
import { useToast } from '@/components/ui/Toaster';
import { useDates, useTypeLabel } from './labels';
import { useLibrary } from './LibraryProvider';
import { useLibraryUI } from './LibraryUIProvider';

const fullName = (p: CslName) => (p.family ? [p.family, p.given].filter(Boolean).join(', ') : p.literal ?? '');

function cslDate(item: Item): string | null {
  const parts = item.csl.issued?.['date-parts']?.[0];
  if (!parts?.length) return null;
  return parts.map((p, i) => (i === 0 ? String(p) : String(p).padStart(2, '0'))).join('-');
}

export function ItemDetails({ item, inTrash }: { item: Item; inTrash: boolean }) {
  const t = useTranslations('details');
  const tLib = useTranslations('library');
  const typeLabel = useTypeLabel();
  const dates = useDates();
  const { items, facts, projects, reload } = useLibrary();
  const ui = useLibraryUI();
  const { toast } = useToast();

  const tagPaths = facts.tagPathsByItem.get(item.id) ?? [];
  const itemProjects = projects.filter((p) => facts.projectIdsByItem.get(item.id)?.has(p.id));
  const notesOn = items.filter((n) => n.anchorItemId === item.id);
  const csl = item.csl;
  const people = [...(csl.author ?? []), ...(csl.editor ?? [])].map(fullName).filter(Boolean);

  const rows: [string, string | null | undefined][] =
    item.kind === 'note'
      ? []
      : [
          [t('citekey'), item.citekey],
          [t('authors'), people.join('; ')],
          [t('date'), cslDate(item)],
          [t('journal'), csl['container-title']],
          [t('volume'), csl.volume],
          [t('pages'), csl.page],
          [t('publisher'), csl.publisher],
          [t('place'), csl['publisher-place']],
          [t('archive'), csl.archive],
          [t('reference'), csl.archive_location],
          [t('doi'), csl.DOI],
          [
            t('content'),
            item.contentSource === 'drive_pdf'
              ? item.hasTextLayer === false
                ? t('pdfNoText')
                : t('pdfPages', { count: item.pageCount ?? 0 })
              : item.contentSource === 'pasted'
                ? t('pasted')
                : t('noContent'),
          ],
        ];

  const restore = async () => {
    await getData().restoreItems([item.id]);
    await Promise.all([reload(), ui.showTrash()]);
    toast(tLib('restored'));
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-sage">
          <KindIcon kind={item.kind} size={13} />
          {typeLabel(item)}
        </p>
        <h2 className="font-display text-[19px] font-medium leading-snug text-balance">{item.title}</h2>
        {inTrash ? (
          <button
            type="button"
            onClick={() => void restore()}
            className="flex items-center gap-1.5 self-start rounded-md border border-dust bg-surface px-3 py-1 text-[13px] hover:border-stone"
          >
            <RotateCcw size={14} strokeWidth={1.7} /> {tLib('restore')}
          </button>
        ) : (
          <Link href={`/item/${item.id}`} className="self-start rounded-md bg-accent px-3 py-1 text-[13px] text-paper hover:opacity-90">
            {tLib('open')}
          </Link>
        )}
      </section>

      {rows.some(([, v]) => v) && (
        <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1 text-[13px]">
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="pt-0.5 font-mono text-[10.5px] text-sage">{k}</dt>
                <dd className="min-w-0 break-words">{v}</dd>
              </div>
            ))}
        </dl>
      )}

      {item.kind === 'note' && item.body && (
        <p className="line-clamp-6 whitespace-pre-line text-[13.5px] text-sage">{item.body}</p>
      )}

      <Section label={t('tags')}>
        {tagPaths.length ? (
          <div className="flex flex-wrap gap-1.5">
            {tagPaths.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => ui.setTag(path)}
                className="rounded-full bg-sand px-2 py-px text-[12px] hover:bg-dust"
              >
                {path}
              </button>
            ))}
          </div>
        ) : (
          <Empty>{t('noTags')}</Empty>
        )}
      </Section>

      <Section label={t('projects')}>
        {itemProjects.length ? (
          <div className="flex flex-wrap gap-1.5">
            {itemProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => ui.setProject(p.id)}
                className="rounded-full bg-soft px-2 py-px text-[12px] text-accent hover:bg-softer"
              >
                {p.name}
              </button>
            ))}
          </div>
        ) : (
          <Empty>{t('noProjects')}</Empty>
        )}
      </Section>

      {notesOn.length > 0 && (
        <Section label={t('notesOn')}>
          {notesOn.map((n) => (
            <Link key={n.id} href={`/item/${n.id}`} className="flex items-center gap-2 py-0.5 text-[13px] hover:text-accent">
              <KindIcon kind="note" size={13} />
              <span className="truncate">{n.title}</span>
            </Link>
          ))}
        </Section>
      )}

      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-1 text-[13px]">
        <dt className="font-mono text-[10.5px] text-sage">{t('created')}</dt>
        <dd>{dates.full(item.createdAt)}</dd>
        <dt className="font-mono text-[10.5px] text-sage">{t('modified')}</dt>
        <dd>{dates.full(item.updatedAt)}</dd>
        {inTrash && item.deletedAt && (
          <>
            <dt className="font-mono text-[10.5px] text-sage">{t('inTrash')}</dt>
            <dd>{dates.full(item.deletedAt)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="font-mono text-[10.5px] font-normal uppercase tracking-wider text-sage">{label}</h3>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12.5px] italic text-stone">{children}</p>;
}
