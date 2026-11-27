// Browser side of the language switch: the server reads this cookie on every request.
import { LOCALE_COOKIE, type Locale } from '@/i18n/locales';

export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
