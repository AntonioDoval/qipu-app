'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';
import type { Item } from '@/data';
import { fullDate, smartDate } from '@/lib/format';

/** "Book", "Interview"… translated; the user's own source types are shown as written. */
export function useTypeLabel(): (item: Pick<Item, 'type'>) => string {
  const t = useTranslations('types');
  return useCallback((item) => (t.has(item.type) ? t(item.type) : item.type), [t]);
}

/** Smart and full dates in the interface language. */
export function useDates() {
  const locale = useLocale();
  const t = useTranslations('library');
  const tag = locale === 'en' ? 'en-GB' : locale;
  return {
    smart: (value: string) => smartDate(value, tag, t('yesterday')),
    full: (value: string) => fullDate(value, tag),
  };
}
