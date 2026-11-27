'use client';

// Sign in with Google only (decided 2026-11-25): Qipu stores PDFs in the user's Google Drive.

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { signInWithGoogle } from '@/lib/google/driveAuth';

export default function LoginPage({ failed }: { failed?: boolean }) {
  const t = useTranslations('auth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(failed ? t('authError') : null);

  const signIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle(); // leaves the page for Google's sign-in
    } catch (e) {
      setError(e instanceof Error ? e.message : t('authError'));
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <div className="flex w-full max-w-[360px] flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="mb-2 font-display text-[48px] font-semibold leading-none tracking-tight">Qipu</h1>
          <p className="text-[14px] text-stone">{t('tagline')}</p>
        </div>

        <div className="flex w-full flex-col gap-4 rounded-xl border border-sand bg-cream p-6">
          <button
            type="button"
            onClick={() => void signIn()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-accent px-4 py-2.5 text-[14.5px] text-paper hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <GoogleMark />}
            {t('signInWithGoogle')}
          </button>
          <p className="text-[12.5px] leading-relaxed text-sage">{t('driveNote')}</p>
          {error && (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-paper font-display text-[13px] font-semibold text-accent">
      G
    </span>
  );
}
