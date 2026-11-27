import type { Metadata } from 'next';
import { Fraunces, JetBrains_Mono, Lora } from 'next/font/google';
import { getLocale, getTranslations } from 'next-intl/server';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { ToastProvider } from '@/components/ui/Toaster';
import type { Locale } from '@/i18n/locales';
import './globals.css';

// Fonts are downloaded at build time and served with the app (no request to Google per visit).
const display = Fraunces({ subsets: ['latin', 'latin-ext'], variable: '--font-display', display: 'swap' });
const body = Lora({ subsets: ['latin', 'latin-ext'], variable: '--font-body', display: 'swap', style: ['normal', 'italic'] });
const mono = JetBrains_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-mono', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app');
  return { title: 'Qipu', description: t('description') };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;

  return (
    <html lang={locale} className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
