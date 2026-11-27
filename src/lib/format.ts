// Display formats shared by the library list, the top bar and the panels.

import type { CslData, CslName, Item } from '@/data/types';

function nameOf(n: CslName): string {
  return (n.family ?? n.literal ?? n.given ?? '').trim();
}

/** "Malinowski" · "Alberti & Mayer" · "Mayer et al." (authors, else editors, else interviewers). */
export function authorsShort(csl: CslData): string {
  const people = [csl.author, csl.editor, csl.interviewer].find((list) => list && list.length > 0) ?? [];
  const names = people.map(nameOf).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} et al.`;
}

/** Cut to `max` characters, adding "…" only when something was actually cut. */
export function trimLabel(text: string, max = 15): string {
  const t = text.trim();
  return t.length > max ? t.slice(0, max).trimEnd() + '…' : t;
}

/** Top-bar label of an open item: "Malinowski, 1922" for texts, the title for notes. */
export function shortLabel(item: Pick<Item, 'kind' | 'title' | 'csl' | 'year'>): string {
  if (item.kind === 'note') return trimLabel(item.title);
  const authors = authorsShort(item.csl);
  if (!authors) return trimLabel(item.title);
  return item.year != null ? `${trimLabel(authors)}, ${item.year}` : trimLabel(authors);
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * "14:32" today → "Yesterday" / "Ayer" → weekday within 6 days → "12 Mar" this year → "12 Mar 2024".
 * `yesterday` is the translated word, passed in so this stays independent of the i18n library.
 */
export function smartDate(value: string | Date, locale: string, yesterday: string, now: Date = new Date()): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / DAY);
  if (days === 0) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return yesterday;
  if (days > 1 && days < 7) return d.toLocaleDateString(locale, { weekday: 'short' });
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Full date and time, for tooltips. */
export function fullDate(value: string | Date, locale: string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

export interface SnippetPart {
  text: string;
  match: boolean;
}

/** Search snippets mark matches with ⟦ ⟧. Split them into parts to render safely (no HTML). */
export function splitSnippet(snippet: string): SnippetPart[] {
  const parts: SnippetPart[] = [];
  for (const piece of snippet.split(/(⟦[^⟧]*⟧)/)) {
    if (!piece) continue;
    if (piece.startsWith('⟦') && piece.endsWith('⟧')) parts.push({ text: piece.slice(1, -1), match: true });
    else parts.push({ text: piece, match: false });
  }
  return parts;
}
