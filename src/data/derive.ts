// The fields the database derives from CSL (year, date precision, authors text, sort key, citekey),
// computed in JavaScript for the in-memory data layer. Must behave like items_derive() in
// supabase/migrations/002_core_model.sql.

import { foldText } from '@/lib/format';
import type { CslData, CslName, Item } from './types';

type Derived = Pick<Item, 'year' | 'datePrecision' | 'creatorsText' | 'sortCreator'>;

const PEOPLE_ROLES = ['author', 'editor', 'interviewer'] as const;

function people(csl: CslData): CslName[] {
  return PEOPLE_ROLES.flatMap((role) => (Array.isArray(csl[role]) ? (csl[role] as CslName[]) : []));
}

export function deriveFromCsl(csl: CslData): Derived {
  let year: number | null = null;
  let datePrecision: Item['datePrecision'] = null;
  const parts = csl.issued?.['date-parts']?.[0];
  if (Array.isArray(parts) && /^-?\d{1,4}$/.test(String(parts[0] ?? ''))) {
    year = Number(parts[0]);
    const month = /^\d{1,2}$/.test(String(parts[1] ?? '')) && Number(parts[1]) >= 1 && Number(parts[1]) <= 12;
    const day = month && /^\d{1,2}$/.test(String(parts[2] ?? ''));
    datePrecision = day ? 'day' : month ? 'month' : 'year';
  }
  const list = people(csl);
  const creatorsText = list
    .map((p) => [p.given, p.family, p.literal].filter(Boolean).join(' ').trim())
    .filter(Boolean)
    .join('; ');
  const first = list.map((p) => p.family ?? p.literal).find(Boolean);
  return { year, datePrecision, creatorsText, sortCreator: first ? foldText(first) : '' };
}

/** "malinowski1922": first surname (letters and digits only, no accents) + year, or "nd". */
export function citekeyBase(csl: CslData, title: string, year: number | null): string {
  const first = people(csl).map((p) => p.family ?? p.literal).find(Boolean) ?? title.split(' ')[0] ?? '';
  const base = foldText(first).replace(/[^a-z0-9]/g, '').slice(0, 40) || 'ref';
  return base + (year != null ? String(year) : 'nd');
}

/** base, then base+b, base+c… (base+a is never used), skipping keys already taken. */
export function nextCitekey(base: string, taken: Set<string>): string {
  for (let n = 0; ; n++) {
    const suffix = n === 0 ? '' : n < 26 ? String.fromCharCode(97 + n) : String.fromCharCode(96 + Math.floor(n / 26)) + String.fromCharCode(97 + (n % 26));
    if (!taken.has(base + suffix)) return base + suffix;
  }
}
