'use client';

// "Where should Qipu keep your files?": name and location of the Qipu folder in Google Drive.
// Qipu always creates a NEW folder; Drive never replaces a folder with the same name.

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FolderOpen, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { getData, type StorageLocation } from '@/data';
import { pickDriveFolder } from '@/lib/google/picker';

export function StorageSetupDialog(props: { current: StorageLocation | null; onDone: (location: StorageLocation) => void; onCancel: () => void }) {
  const t = useTranslations('storage');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [name, setName] = useState('Qipu');
  const [parent, setParent] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async () => {
    setError(null);
    try {
      const folder = await pickDriveFolder({ title: t('pickerTitle'), locale });
      if (folder) setParent(folder);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      props.onDone(await getData().createStorageFolder(name.trim() || 'Qipu', parent?.id ?? null));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={props.current ? t('changeTitle') : t('title')}
      onClose={props.onCancel}
      busy={busy}
      footer={
        <>
          <button type="button" onClick={props.onCancel} disabled={busy} className="rounded-md px-3 py-1.5 text-[13.5px] text-sage hover:bg-sand">
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            onClick={() => void create()}
            disabled={busy || !name.trim()}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13.5px] text-paper hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 size={14} className="animate-spin" />} {t('create')}
          </button>
        </>
      }
    >
      <p className="text-[13.5px] text-sage">{t('intro')}</p>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-sage">{t('name')}</span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={255}
          className="rounded-md border border-dust bg-surface px-2.5 py-1.5 text-[14px] outline-none focus:border-accent2"
        />
      </label>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-sage">{t('location')}</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[14px]">
            <FolderOpen size={15} strokeWidth={1.7} className="text-sage" />
            {parent ? parent.name : t('myDrive')}
          </span>
          <button type="button" onClick={() => void choose()} disabled={busy} className="text-[13px] text-accent hover:underline">
            {t('chooseLocation')}
          </button>
          {parent && (
            <button type="button" onClick={() => setParent(null)} disabled={busy} className="text-[13px] text-sage hover:underline">
              {t('useMyDrive')}
            </button>
          )}
        </div>
      </div>
      <p className="rounded-md bg-cream px-3 py-2 text-[12.5px] text-sage">{props.current ? t('changeNote', { name: props.current.folderName }) : t('newFolderNote')}</p>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}
