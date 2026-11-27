'use client';

// Basic note editor (step 3.3): title and Markdown text, saved automatically.
// #tags and [[links]] written here are recognized when saving (the data layer keeps them in sync).
// The full editor (Read mode, suggestions while typing [[ and #) comes in step 7.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { ItemDetails } from '@/components/library/ItemDetails';
import { useLibrary } from '@/components/library/LibraryProvider';
import { ViewWithPanel } from '@/components/shell/ViewWithPanel';
import { ConflictError, getData, type Item } from '@/data';
import { timeAgo } from '@/lib/format';

type SaveState = 'saved' | 'unsaved' | 'saving' | 'conflict' | 'error';
const AUTOSAVE_MS = 800;

export function NoteEditor({ id }: { id: string }) {
  const t = useTranslations('note');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const lib = useLibrary();

  const [note, setNote] = useState<Item | null>(null);
  const [missing, setMissing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [now, setNow] = useState(() => new Date());

  // What the database has (to know whether there is something to save), and its revision.
  const saved = useRef({ title: '', body: '', revision: 0 });
  // The text as typed, readable from timers and when leaving (updated on every keystroke).
  const latest = useRef({ title: '', body: '' });

  const load = useCallback(async () => {
    const item = await getData().getItem(id);
    if (!item || item.kind !== 'note' || item.deletedAt) {
      setMissing(true);
      return;
    }
    saved.current = { title: item.title, body: item.body ?? '', revision: item.revision };
    latest.current = { title: item.title, body: item.body ?? '' };
    setNote(item);
    setTitle(item.title);
    setBody(item.body ?? '');
    setSaveState('saved');
  }, [id]);

  useEffect(() => {
    // Load the note when it opens, and remember it as recently opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state changes after the data arrives
    void load();
    void getData().markOpened(id).catch(() => undefined);
  }, [id, load]);

  const save = useCallback(async () => {
    const { title: tNow, body: bNow } = latest.current;
    if (tNow === saved.current.title && bNow === saved.current.body) return;
    setSaveState('saving');
    try {
      const result = await getData().saveNote(id, { title: tNow, body: bNow }, saved.current.revision);
      saved.current = { title: tNow, body: bNow, revision: result.revision };
      setNote(result);
      lib.upsertItem(result);
      void lib.reloadTags().catch(() => undefined);
      const changedSince = latest.current.title !== tNow || latest.current.body !== bNow;
      setSaveState(changedSince ? 'unsaved' : 'saved');
    } catch (e) {
      setSaveState(e instanceof ConflictError ? 'conflict' : 'error');
    }
  }, [id, lib]);

  // Save a moment after typing stops.
  useEffect(() => {
    if (!note || saveState === 'conflict') return;
    if (title === saved.current.title && body === saved.current.body) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [title, body, note, save, saveState]);

  // Leaving the note: save what is left, then refresh tags and links in the library.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      const { title: tNow, body: bNow } = latest.current;
      if (tNow !== saved.current.title || bNow !== saved.current.body) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      void save().finally(() => void lib.reload());
    };
    // Only on mount/unmount: `save` and `lib` read the latest values through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep "Saved 2 minutes ago" current.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (missing) {
    return <p className="mx-auto mt-16 max-w-md px-6 text-center text-[14px] text-sage">{t('missing')}</p>;
  }
  if (!note) {
    return (
      <p className="flex items-center gap-2 p-6 text-[13px] text-sage">
        <Loader2 size={15} className="animate-spin" /> {tCommon('loading')}
      </p>
    );
  }

  const status =
    saveState === 'saving'
      ? t('saving')
      : saveState === 'unsaved'
        ? t('unsaved')
        : saveState === 'error'
          ? t('saveError')
          : t('saved', { ago: timeAgo(note.updatedAt, locale, now) });

  return (
    <ViewWithPanel panelLabel={t('details')} panel={<ItemDetails item={lib.itemById(id) ?? note} inTrash={false} showOpen={false} />}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[720px] flex-col gap-2 px-5 pb-24 pt-8 md:px-8">
          {saveState === 'conflict' && (
            <div role="alert" className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-dust bg-cream px-4 py-3 text-[13.5px]">
              <span className="flex-1">{t('conflict')}</span>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-md border border-dust bg-surface px-3 py-1 text-[13px] hover:border-stone"
              >
                {t('reload')}
              </button>
            </div>
          )}
          <input
            value={title}
            onChange={(e) => {
              latest.current = { ...latest.current, title: e.target.value };
              setTitle(e.target.value);
            }}
            aria-label={t('titleLabel')}
            placeholder={t('untitled')}
            maxLength={1000}
            className="w-full bg-transparent font-display text-[30px] font-medium tracking-tight outline-none placeholder:text-stone"
          />
          <p aria-live="polite" className={`text-[12px] ${saveState === 'error' ? 'text-danger' : 'text-stone'}`}>
            {status}
          </p>
          <textarea
            value={body}
            onChange={(e) => {
              latest.current = { ...latest.current, body: e.target.value };
              setBody(e.target.value);
            }}
            aria-label={t('bodyLabel')}
            placeholder={t('placeholder')}
            className="mt-3 min-h-[60vh] w-full resize-none bg-transparent font-mono text-[13.5px] leading-[1.75] outline-none placeholder:text-stone"
          />
        </div>
      </div>
    </ViewWithPanel>
  );
}
