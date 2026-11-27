// Shared by the server (request.ts) and the browser (language switch).
export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';
export const LOCALE_COOKIE = 'qipu-locale';
