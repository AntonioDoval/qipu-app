'use client';

// Interface language, switched instantly in the browser: both message files ship with the app,
// so changing language does not need a round trip to the server. The cookie makes the server
// use the same language on the next visit.

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type { Locale } from '@/i18n/locales';
import { setLocaleCookie } from '@/lib/locale';
import en from '@/messages/en.json';
import es from '@/messages/es.json';

export const MESSAGES = { es, en } as const;

interface LocaleApi {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleApi | null>(null);

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, setState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleCookie(next);
    document.documentElement.lang = next;
    setState(next);
  }, []);

  const api = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LocaleContext.Provider value={api}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocaleSwitch(): LocaleApi {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocaleSwitch must be used inside <LocaleProvider>');
  return ctx;
}
