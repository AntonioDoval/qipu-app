'use client';

// The library: search bar, kind switch, filters, columns, the sortable list, and details on the right.

import { useLayoutEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Columns3, FileText, Highlighter, Inbox, Loader2, PenLine, Search, SlidersHorizontal, X } from 'lucide-react';
import { KindIcon } from '@/components/shell/KindIcon';
import { ViewWithPanel } from '@/components/shell/ViewWithPanel';
import { Popover } from '@/components/ui/Popover';
import type { Item } from '@/data';
import { authorsShort, splitSnippet } from '@/lib/format';
import { filterItems, sortItems, type HasFilter, type KindFilter, type SortKey } from '@/lib/libraryQuery';
import { ItemDetails } from './ItemDetails';
import { useDates, useTypeLabel } from './labels';
import { useLibrary } from './LibraryProvider';
import { ALL_COLUMNS, useLibraryUI, type Column } from './LibraryUIProvider';

const KINDS: KindFilter[] = ['all', 'bibliography', 'source', 'note'];
const HAS: HasFilter[] = ['pdf', 'annotations', 'notes'];
const SORTABLE: Partial<Record<Column, SortKey>> = {
  kind: 'kind',
  title: 'title',
  authors: 'authors',
  year: 'year',
  created: 'created',
  modified: 'modified',
};

export function LibraryView() {
  const t = useTranslations('library');
  const tCol = useTranslations('columns');
  const tKinds = useTranslations('kinds');
  const tCommon = useTranslations('common');
  const lib = useLibrary();
  const ui = useLibraryUI();
  const router = useRouter();
  const typeLabel = useTypeLabel();
  const dates = useDates();
  const { query } = ui;

  const visible = useMemo(() => {
    if (ui.trash) return sortItems(ui.trashItems, query.sort);
    const filtered = filterItems(lib.items, query, { ...lib.facts, fullTextHits: ui.fullTextHits });
    return sortItems(filtered, query.sort);
  }, [ui.trash, ui.trashItems, lib.items, lib.facts, query, ui.fullTextHits]);

  const selected =
    (ui.trash ? ui.trashItems.find((i) => i.id === ui.selectedId) : lib.itemById(ui.selectedId ?? '')) ?? null;

  // Come back to the same scroll position after opening an item.
  const scroller = useRef<HTMLDivElement>(null);
  const { savedScroll } = ui;
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = savedScroll();
  }, [savedScroll]);

  const project = lib.projects.find((p) => p.id === query.projectId);
  const tagOptions = useMemo(
    () => [...new Set([...lib.facts.tagPathsByItem.values()].flat())].sort(),
    [lib.facts.tagPathsByItem],
  );
  const activeFilters = !!(query.projectId || query.tag || query.has.length);
  const heading = ui.trash ? t('trashTitle') : query.kind === 'all' ? t('title') : tKinds(query.kind);
  const show = (c: Column) => ui.columns.includes(c);

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void ui.runFullText();
    if (e.key === 'Escape') ui.clearFullText();
  };

  const panel = selected ? (
    <ItemDetails item={selected} inTrash={ui.trash} />
  ) : (
    <p className="text-[13px] italic text-sage">{t('selectHint')}</p>
  );

  return (
    <ViewWithPanel panelLabel={t('title')} panel={panel}>
      {/* Heading */}
      <div className="flex items-baseline gap-3 border-b border-dust px-5 py-3 md:px-6">
        <h1 className="font-display text-[21px] font-medium">{heading}</h1>
        {lib.status === 'ready' && <span className="text-[13px] text-sage">{t('count', { count: visible.length })}</span>}
        {ui.trash && (
          <button type="button" onClick={ui.resetAll} className="ml-auto text-[13px] text-accent hover:underline">
            {t('backToLibrary')}
          </button>
        )}
      </div>

      {/* Search, kind, filters, columns */}
      {!ui.trash && (
        <div className="flex flex-wrap items-center gap-2 border-b border-sand px-5 py-2 md:px-6">
          <label className="flex min-w-0 flex-[1_1_260px] items-center gap-2 rounded-md border border-dust bg-surface px-2.5 py-1.5 focus-within:border-accent2">
            <Search size={15} strokeWidth={1.7} className="shrink-0 text-sage" />
            <input
              value={query.text}
              onChange={(e) => ui.setText(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="w-full min-w-0 bg-transparent text-[13.5px] outline-none placeholder:text-stone"
            />
            {query.text && (
              <button type="button" onClick={ui.clearFullText} aria-label={t('clearSearch')} className="text-stone hover:text-ink">
                <X size={14} />
              </button>
            )}
          </label>

          <div role="group" className="flex gap-0.5 rounded-md bg-sand p-0.5">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => ui.setKind(k)}
                aria-pressed={query.kind === k}
                className="rounded px-2.5 py-1 text-[12.5px] text-sage aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-sm"
              >
                {k === 'all' ? t('all') : tKinds(k)}
              </button>
            ))}
          </div>

          <Popover
            button={() => (
              <>
                <SlidersHorizontal size={14} strokeWidth={1.7} /> {t('filter')}
              </>
            )}
            buttonClassName="flex items-center gap-1.5 rounded-md border border-dust bg-surface px-2.5 py-1 text-[13px] hover:border-stone aria-expanded:border-accent2"
            panelClassName="w-72"
          >
            <div className="flex flex-col gap-3 text-[13px]">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-sage">{t('project')}</span>
                <select
                  value={query.projectId ?? ''}
                  onChange={(e) => ui.setProject(e.target.value || null)}
                  className="rounded-md border border-dust bg-surface px-2 py-1"
                >
                  <option value="">{t('anyProject')}</option>
                  {lib.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-sage">{t('tag')}</span>
                <select
                  value={query.tag ?? ''}
                  onChange={(e) => ui.setTag(e.target.value || null)}
                  className="rounded-md border border-dust bg-surface px-2 py-1"
                >
                  <option value="">{t('anyTag')}</option>
                  {tagOptions.map((path) => (
                    <option key={path} value={path}>
                      {path}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1 font-mono text-[10.5px] uppercase tracking-wider text-sage">{t('has')}</legend>
                {HAS.map((h) => (
                  <label key={h} className="flex items-center gap-2">
                    <input type="checkbox" checked={query.has.includes(h)} onChange={() => ui.toggleHas(h)} className="accent-accent" />
                    {t(h === 'pdf' ? 'hasPdf' : h === 'annotations' ? 'hasAnnotations' : 'hasNotes')}
                  </label>
                ))}
              </fieldset>
            </div>
          </Popover>

          <Popover
            button={() => <Columns3 size={15} strokeWidth={1.7} />}
            buttonLabel={t('columns')}
            buttonClassName="hidden rounded-md p-1.5 text-sage hover:bg-sand hover:text-ink md:block"
            align="right"
            panelClassName="w-48"
          >
            <fieldset className="flex flex-col gap-1 text-[13px]">
              <legend className="mb-1 font-mono text-[10.5px] uppercase tracking-wider text-sage">{t('columns')}</legend>
              {ALL_COLUMNS.map((c) => (
                <label key={c} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={show(c)}
                    disabled={c === 'title'}
                    onChange={() => ui.toggleColumn(c)}
                    className="accent-accent"
                  />
                  {tCol(c)}
                </label>
              ))}
            </fieldset>
          </Popover>
        </div>
      )}

      {/* Active filters as removable badges */}
      {!ui.trash && (activeFilters || query.fullText) && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-sand px-5 py-1.5 md:px-6">
          {project && <Badge onRemove={() => ui.setProject(null)}>{project.name}</Badge>}
          {query.tag && <Badge onRemove={() => ui.setTag(null)}>#{query.tag}</Badge>}
          {query.has.map((h) => (
            <Badge key={h} onRemove={() => ui.toggleHas(h)}>
              {t('has')}: {t(h === 'pdf' ? 'hasPdf' : h === 'annotations' ? 'hasAnnotations' : 'hasNotes')}
            </Badge>
          ))}
          {query.fullText && <Badge onRemove={ui.clearFullText}>{t('fullText', { query: query.fullText })}</Badge>}
          {activeFilters && (
            <button type="button" onClick={ui.clearFilters} className="ml-1 text-[12px] text-accent hover:underline">
              {t('clearFilters')}
            </button>
          )}
        </div>
      )}

      {/* The list */}
      <div
        ref={scroller}
        onScroll={(e) => ui.rememberScroll(e.currentTarget.scrollTop)}
        className="qipu-list min-h-0 flex-1 overflow-auto"
      >
        {lib.status === 'loading' && (
          <p className="flex items-center gap-2 p-6 text-[13px] text-sage">
            <Loader2 size={15} className="animate-spin" /> {tCommon('loading')}
          </p>
        )}

        {lib.status === 'error' && (
          <div className="m-6 rounded-lg border border-dust bg-surface p-4 text-[13.5px]">
            <p className="font-medium text-danger">{t('loadError')}</p>
            <p className="mt-1 font-mono text-[11.5px] text-sage">{lib.error}</p>
            <button
              type="button"
              onClick={() => void lib.reload()}
              className="mt-3 rounded-md border border-dust px-3 py-1 text-[13px] hover:border-stone"
            >
              {tCommon('retry')}
            </button>
          </div>
        )}

        {query.fullText && ui.searchStatus === 'searching' && (
          <p className="flex items-center gap-2 px-6 py-3 text-[13px] text-sage">
            <Loader2 size={15} className="animate-spin" /> {t('searching')}
          </p>
        )}
        {query.fullText && ui.searchStatus === 'error' && <p className="px-6 py-3 text-[13px] text-danger">{t('searchError')}</p>}

        {lib.status === 'ready' && !ui.trash && lib.items.length === 0 && (
          <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 px-6 text-center">
            <Inbox size={36} strokeWidth={1.3} className="text-stone" />
            <h2 className="font-display text-[19px] font-medium">{t('emptyTitle')}</h2>
            <p className="text-[14px] text-sage">{t('emptyBody')}</p>
          </div>
        )}

        {lib.status === 'ready' && visible.length === 0 && (ui.trash || lib.items.length > 0) && ui.searchStatus !== 'searching' && (
          <div className="mx-auto mt-12 flex max-w-md flex-col items-center gap-3 px-6 text-center text-[14px] text-sage">
            <p className="italic">{ui.trash ? t('trashEmpty') : t('noMatches')}</p>
            {!ui.trash && (activeFilters || query.text) && (
              <button
                type="button"
                onClick={() => {
                  ui.clearFilters();
                  ui.clearFullText();
                }}
                className="text-[13px] text-accent hover:underline"
              >
                {t('clearFilters')}
              </button>
            )}
          </div>
        )}

        {lib.status === 'ready' && visible.length > 0 && (
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                {ALL_COLUMNS.filter(show).map((c) => {
                  const key = SORTABLE[c];
                  const active = key && query.sort.key === key;
                  const hideSmall = c !== 'kind' && c !== 'title';
                  return (
                    <th
                      key={c}
                      scope="col"
                      aria-sort={active ? (query.sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`qipu-col-${c} sticky top-0 z-10 whitespace-nowrap border-b border-dust bg-paper px-1.5 py-1.5 text-left font-normal first:pl-5 md:first:pl-6 ${hideSmall ? 'hidden md:table-cell' : ''}`}
                    >
                      {key ? (
                        <button
                          type="button"
                          onClick={() => ui.sortBy(key)}
                          className={`inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-wider ${active ? 'text-ink' : 'text-sage hover:text-ink'}`}
                        >
                          {tCol(c)}
                          {active && (query.sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                        </button>
                      ) : (
                        <span className="font-mono text-[10.5px] uppercase tracking-wider text-sage">{tCol(c)}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  columns={ALL_COLUMNS.filter(show)}
                  selected={item.id === ui.selectedId}
                  onSelect={() => ui.select(item.id)}
                  onOpen={() => !ui.trash && router.push(`/item/${item.id}`)}
                  trash={ui.trash}
                  typeLabel={typeLabel(item)}
                  smartDate={dates.smart}
                  fullDate={dates.full}
                  tagPaths={lib.facts.tagPathsByItem.get(item.id) ?? []}
                  onTag={ui.setTag}
                  annotationCount={lib.facts.annotationCount.get(item.id) ?? 0}
                  noteCount={lib.facts.noteCount.get(item.id) ?? 0}
                  snippet={query.fullText ? ui.fullTextHits?.get(item.id) : undefined}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ViewWithPanel>
  );
}

function Badge({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2 py-px text-[12px] text-accent">
      {children}
      <button type="button" onClick={onRemove} aria-label="×" className="text-accent2 hover:text-ink">
        <X size={12} />
      </button>
    </span>
  );
}

function Row(props: {
  item: Item;
  columns: Column[];
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  trash: boolean;
  typeLabel: string;
  smartDate: (v: string) => string;
  fullDate: (v: string) => string;
  tagPaths: string[];
  onTag: (path: string) => void;
  annotationCount: number;
  noteCount: number;
  snippet?: { page: number | null; snippet: string };
}) {
  const t = useTranslations('library');
  const { item } = props;
  const cell = 'border-b border-sand px-1.5 py-2 align-top first:pl-5 md:first:pl-6';
  const small = 'hidden md:table-cell';

  const cells: Record<Column, React.ReactNode> = {
    kind: (
      <td key="kind" className={`qipu-col-kind ${cell} w-[84px]`}>
        <span className="flex flex-col items-start gap-0.5" title={props.typeLabel}>
          <KindIcon kind={item.kind} size={14} />
          <span className="font-mono text-[10px] leading-tight text-sage">{props.typeLabel}</span>
        </span>
      </td>
    ),
    title: (
      <td key="title" className={`qipu-col-title ${cell} min-w-[190px]`}>
        {props.trash ? (
          <span className="font-medium leading-snug">{item.title}</span>
        ) : (
          <Link
            href={`/item/${item.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium leading-snug hover:text-accent hover:underline hover:underline-offset-2"
          >
            {item.title}
          </Link>
        )}
        {props.snippet && (
          <p className="mt-1 text-[12.5px] text-sage">
            {props.snippet.page != null && <span className="mr-1.5 font-mono text-[11px]">{t('page', { page: props.snippet.page })}</span>}
            {splitSnippet(props.snippet.snippet).map((part, k) =>
              part.match ? (
                <mark key={k} className="rounded-sm bg-soft px-0.5 text-ink">
                  {part.text}
                </mark>
              ) : (
                <span key={k}>{part.text}</span>
              ),
            )}
          </p>
        )}
      </td>
    ),
    authors: (
      <td key="authors" className={`qipu-col-authors ${cell} ${small} max-w-[130px] truncate`} title={item.creatorsText}>
        {item.kind === 'note' ? '' : authorsShort(item.csl)}
      </td>
    ),
    year: (
      <td key="year" className={`qipu-col-year ${cell} ${small} font-mono text-[11.5px] text-sage`}>
        {item.kind === 'note' ? '' : item.year ?? ''}
      </td>
    ),
    created: (
      <td key="created" className={`qipu-col-created ${cell} ${small} whitespace-nowrap font-mono text-[11.5px] text-sage`} title={props.fullDate(item.createdAt)}>
        {props.smartDate(item.createdAt)}
      </td>
    ),
    modified: (
      <td key="modified" className={`qipu-col-modified ${cell} ${small} whitespace-nowrap font-mono text-[11.5px] text-sage`} title={props.fullDate(item.updatedAt)}>
        {props.smartDate(item.updatedAt)}
      </td>
    ),
    tags: (
      <td key="tags" className={`qipu-col-tags ${cell} ${small}`}>
        <div className="flex flex-wrap gap-1">
          {props.tagPaths.slice(0, 3).map((path) => (
            <button
              key={path}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                props.onTag(path);
              }}
              title={path}
              className="max-w-[112px] truncate whitespace-nowrap rounded-full bg-sand px-2 py-px text-[11.5px] hover:bg-dust"
            >
              {path}
            </button>
          ))}
          {props.tagPaths.length > 3 && <span className="font-mono text-[11px] text-stone">+{props.tagPaths.length - 3}</span>}
        </div>
      </td>
    ),
    has: (
      <td key="has" className={`qipu-col-has ${cell} ${small}`}>
        <span className="flex items-center gap-2 font-mono text-[11px] text-stone">
          {props.annotationCount > 0 && (
            <span className="inline-flex items-center gap-0.5" title={t('annotationsCount', { count: props.annotationCount })}>
              <Highlighter size={12} /> {props.annotationCount}
            </span>
          )}
          {props.noteCount > 0 && (
            <span className="inline-flex items-center gap-0.5" title={t('notesCount', { count: props.noteCount })}>
              <PenLine size={12} /> {props.noteCount}
            </span>
          )}
          {item.contentSource === 'drive_pdf' && <FileText size={12} aria-label="PDF" />}
        </span>
      </td>
    ),
  };

  return (
    <tr
      onClick={props.onSelect}
      onDoubleClick={props.onOpen}
      aria-selected={props.selected}
      className="cursor-default hover:bg-softer aria-selected:bg-soft"
    >
      {props.columns.map((c) => cells[c])}
    </tr>
  );
}
