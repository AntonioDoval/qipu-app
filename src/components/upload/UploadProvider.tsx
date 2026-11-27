'use client';

// Adding PDFs (step 4, part 2): pick files → (first time) choose the Qipu folder → upload each
// file to Drive with a progress bar → create a bibliography item for it.
// Parts 3–5 add text extraction, automatic details and the full upload dialog on top of this.

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, Loader2, X } from 'lucide-react';
import { useLibrary } from '@/components/library/LibraryProvider';
import { getData, StorageNotSetUpError, type StorageLocation } from '@/data';
import { connectDrive, DriveNotConnectedError } from '@/lib/google/driveAuth';
import { StorageSetupDialog } from './StorageSetupDialog';

type UploadStatus = 'waiting' | 'uploading' | 'done' | 'error' | 'drive' | 'notPdf';
interface Upload {
  key: string;
  name: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  itemId?: string;
}

interface UploadApi {
  /** Open the file chooser for PDFs. */
  addPdfs: () => void;
  /** Start uploading these files (also used for drag & drop later). */
  upload: (files: File[]) => Promise<void>;
  /** Choose or change the Qipu folder. */
  openStorageSetup: () => void;
  /** Where files go (undefined = not loaded yet). */
  storage: StorageLocation | null | undefined;
  refreshStorage: () => Promise<StorageLocation | null>;
}

const UploadContext = createContext<UploadApi | null>(null);
const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('upload');
  const lib = useLibrary();
  const pathname = usePathname();
  const input = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<Upload[]>([]);
  const [storage, setStorage] = useState<StorageLocation | null | undefined>(undefined);
  const [setup, setSetup] = useState<{ pending: File[] } | null>(null);

  const patch = (key: string, change: Partial<Upload>) =>
    setQueue((q) => q.map((u) => (u.key === key ? { ...u, ...change } : u)));

  const refreshStorage = useCallback(async () => {
    const profile = await getData().getProfile();
    setStorage(profile.storage);
    return profile.storage;
  }, []);

  const run = useCallback(
    async (files: File[]) => {
      const jobs = files.map((file, k) => ({ file, key: `${Date.now()}-${k}-${file.name}` }));
      setQueue((q) => [
        ...q.filter((u) => u.status === 'uploading' || u.status === 'waiting'),
        ...jobs.map(({ file, key }) => ({ key, name: file.name, progress: 0, status: (isPdf(file) ? 'waiting' : 'notPdf') as UploadStatus })),
      ]);
      // One at a time: keeps the connection steady for large books.
      for (const { file, key } of jobs) {
        if (!isPdf(file)) continue;
        patch(key, { status: 'uploading' });
        try {
          const drive = await getData().storeFile(file, file.name, { onProgress: (p) => patch(key, { progress: p }) });
          const item = await getData().createItem({
            kind: 'bibliography',
            type: 'document',
            title: file.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim() || file.name,
            contentSource: 'drive_pdf',
            drive,
          });
          lib.upsertItem(item);
          patch(key, { status: 'done', progress: 1, itemId: item.id });
        } catch (e) {
          if (e instanceof DriveNotConnectedError) patch(key, { status: 'drive' });
          else patch(key, { status: 'error', error: e instanceof Error ? e.message : String(e) });
          if (e instanceof DriveNotConnectedError || e instanceof StorageNotSetUpError) break;
        }
      }
    },
    [lib],
  );

  const upload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      let location = storage;
      try {
        if (location === undefined) location = await refreshStorage();
      } catch (e) {
        setQueue([{ key: 'profile', name: '', progress: 0, status: 'error', error: e instanceof Error ? e.message : String(e) }]);
        return;
      }
      if (!location) {
        setSetup({ pending: files }); // first time: ask where the Qipu folder goes, then continue
        return;
      }
      await run(files);
    },
    [storage, refreshStorage, run],
  );

  const api = useMemo<UploadApi>(
    () => ({
      addPdfs: () => input.current?.click(),
      upload,
      openStorageSetup: () => setSetup({ pending: [] }),
      storage,
      refreshStorage,
    }),
    [upload, storage, refreshStorage],
  );

  const active = queue.length > 0;
  const finished = queue.every((u) => u.status !== 'waiting' && u.status !== 'uploading');

  return (
    <UploadContext.Provider value={api}>
      {children}

      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          void upload(files);
        }}
      />

      {setup && (
        <StorageSetupDialog
          current={storage ?? null}
          onCancel={() => setSetup(null)}
          onDone={(location) => {
            setStorage(location);
            const pending = setup.pending;
            setSetup(null);
            if (pending.length) void run(pending);
          }}
        />
      )}

      {active && (
        <section
          aria-label={t('title')}
          className="fixed bottom-4 right-4 z-[80] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-xl border border-dust bg-surface p-3 shadow-xl"
        >
          <header className="flex items-center gap-2">
            <h2 className="flex-1 font-mono text-[10.5px] uppercase tracking-wider text-sage">
              {finished ? t('finished') : t('title')}
              {storage && <span className="normal-case"> · {storage.folderName}</span>}
            </h2>
            {finished && (
              <button type="button" onClick={() => setQueue([])} aria-label={t('close')} className="text-stone hover:text-ink">
                <X size={15} />
              </button>
            )}
          </header>
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {queue.map((u) => (
              <li key={u.key} className="flex flex-col gap-1 text-[13px]">
                <div className="flex items-center gap-2">
                  {u.status === 'done' ? (
                    <Check size={14} className="shrink-0 text-kind-source" />
                  ) : u.status === 'uploading' ? (
                    <Loader2 size={14} className="shrink-0 animate-spin text-sage" />
                  ) : null}
                  <span className="truncate" title={u.name}>
                    {u.name}
                  </span>
                </div>
                {u.status === 'uploading' && (
                  <div className="h-1 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={Math.round(u.progress * 100)}>
                    <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(u.progress * 100)}%` }} />
                  </div>
                )}
                {u.status === 'waiting' && <span className="text-[12px] text-stone">{t('waiting')}</span>}
                {u.status === 'notPdf' && <span className="text-[12px] text-danger">{t('notPdf')}</span>}
                {u.status === 'error' && <span className="text-[12px] text-danger">{u.error}</span>}
                {u.status === 'drive' && (
                  <span className="flex items-center gap-2 text-[12px] text-danger">
                    {t('driveNotConnected')}
                    <button type="button" onClick={() => void connectDrive(pathname)} className="rounded bg-accent px-2 py-0.5 text-paper">
                      {t('connect')}
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </UploadContext.Provider>
  );
}

export function useUploads(): UploadApi {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUploads must be used inside <UploadProvider>');
  return ctx;
}
