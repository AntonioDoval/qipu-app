'use client';

// Settings, opened from the bottom of the sidebar: language, keyboard shortcuts, sign out.

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { HardDrive, LogOut, Settings } from 'lucide-react';
import { locales, type Locale } from '@/i18n/locales';
import { signOut } from '@/lib/auth';
import { MESSAGES, useLocaleSwitch } from '@/components/i18n/LocaleProvider';
import { useToast } from '@/components/ui/Toaster';
import { useShortcutLabels } from '@/lib/shortcuts';
import { connectDrive, isDriveConnected } from '@/lib/google/driveAuth';
import { useUploads } from '@/components/upload/UploadProvider';

const LANGUAGE_NAMES: Record<Locale, string> = { es: 'Español', en: 'English' };

export function SettingsMenu() {
  const t = useTranslations('settings');
  const tSide = useTranslations('sidebar');
  const { locale, setLocale } = useLocaleSwitch();
  const { toast } = useToast();
  const keys = useShortcutLabels();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [drive, setDrive] = useState<'checking' | 'connected' | 'not_connected' | 'error'>('checking');
  const pathname = usePathname();
  const uploads = useUploads();
  const box = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const changeLanguage = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
    // Confirm in the new language.
    toast(MESSAGES[next].settings.languageChanged);
  };

  const doSignOut = async () => {
    await signOut();
    router.replace('/');
    router.refresh();
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) {
            // Check Drive each time Settings opens.
            setDrive('checking');
            isDriveConnected()
              .then((ok) => setDrive(ok ? 'connected' : 'not_connected'))
              .catch(() => setDrive('error'));
            void uploads.refreshStorage().catch(() => undefined);
          }
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-[13px] text-ink hover:bg-sand"
      >
        <Settings size={15} strokeWidth={1.7} className="text-sage" />
        {tSide('settings')}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('title')}
          className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border border-dust bg-surface p-3 shadow-lg"
        >
          <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wider text-sage">{t('language')}</p>
          <div className="mb-3 flex gap-1 rounded-md bg-sand p-0.5">
            {locales.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => changeLanguage(l)}
                aria-pressed={l === locale}
                className="flex-1 rounded px-2 py-1 text-[13px] text-sage aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-sm"
              >
                {LANGUAGE_NAMES[l]}
              </button>
            ))}
          </div>

          <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wider text-sage">{t('drive')}</p>
          <div className="mb-3 flex items-center gap-2 text-[13px]">
            <HardDrive size={15} strokeWidth={1.7} className="text-sage" />
            <span className={drive === 'connected' ? 'text-ink' : drive === 'checking' ? 'text-stone' : 'text-danger'}>
              {t(drive === 'connected' ? 'driveConnected' : drive === 'checking' ? 'driveChecking' : drive === 'error' ? 'driveError' : 'driveNotConnected')}
            </span>
            {(drive === 'not_connected' || drive === 'error') && (
              <button
                type="button"
                onClick={() => void connectDrive(pathname)}
                className="ml-auto rounded-md bg-accent px-2.5 py-0.5 text-[12.5px] text-paper hover:opacity-90"
              >
                {t('driveConnect')}
              </button>
            )}
          </div>

          {drive === 'connected' && (
            <div className="-mt-1.5 mb-3 flex items-center gap-2 pl-[23px] text-[12.5px] text-sage">
              <span className="truncate">
                {uploads.storage ? t('driveFolder', { name: uploads.storage.folderName }) : t('driveNoFolder')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  uploads.openStorageSetup();
                }}
                className="ml-auto shrink-0 text-accent hover:underline"
              >
                {uploads.storage ? t('driveChangeFolder') : t('driveChooseFolder')}
              </button>
            </div>
          )}

          <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wider text-sage">{t('shortcuts')}</p>
          <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
            <dt><Kbd>{keys.toggleSidebar}</Kbd></dt>
            <dd>{t('shortcutSidebar')}</dd>
            <dt><Kbd>{keys.togglePanel}</Kbd></dt>
            <dd>{t('shortcutPanel')}</dd>
          </dl>

          <button
            type="button"
            onClick={doSignOut}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-danger hover:bg-softer"
          >
            <LogOut size={15} strokeWidth={1.7} />
            {t('signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-b-2 border-dust bg-paper px-1 font-mono text-[11px] text-sage">{children}</kbd>
  );
}
