// Example library for local previews and tests (never used on staging or production).
// Malinowski 1922 is public domain; the Spanish sources and the notes are invented examples.

import type { AnnotationDraft, ItemDraft } from './types';

export interface SampleItem extends ItemDraft {
  key: string;
  daysAgo: number;
  modifiedDaysAgo?: number;
  tags?: string[];
  projects?: string[];
}

export const SAMPLE_PROJECTS = [
  { key: 'thesis', name: 'Thesis', color: '#4a5b78', parent: null },
  { key: 'ch1', name: 'Ch. 1 — Theories of exchange', color: '#4a5b78', parent: 'thesis' },
  { key: 'ch2', name: 'Ch. 2 — The Huancayo feria', color: '#4a5b78', parent: 'thesis' },
  { key: 'sem', name: 'Seminar: Economic anthropology', color: '#a8803a', parent: null },
] as const;

const book = (key: string, title: string, authors: [string, string][], year: number, publisher: string, place: string, extra: Partial<SampleItem>): SampleItem => ({
  key,
  kind: 'bibliography',
  type: 'book',
  title,
  csl: { author: authors.map(([family, given]) => ({ family, given })), issued: { 'date-parts': [[year]] }, publisher, 'publisher-place': place },
  daysAgo: 30,
  ...extra,
});

export const SAMPLE_ITEMS: SampleItem[] = [
  book('malinowski', 'Argonauts of the Western Pacific', [['Malinowski', 'Bronisław']], 1922, 'Routledge & Kegan Paul', 'London',
    { daysAgo: 41, modifiedDaysAgo: 2, tags: ['exchange/kula', 'exchange/reciprocity'], projects: ['ch1', 'sem'], contentSource: 'drive_pdf', drive: { fileId: 'sample-1', fileName: 'malinowski-1922.pdf', fileSize: 8_400_000, sha256: null }, pageCount: 527, hasTextLayer: true }),
  {
    key: 'mauss', kind: 'bibliography', type: 'article-journal', title: 'Essai sur le don',
    csl: { author: [{ family: 'Mauss', given: 'Marcel' }], issued: { 'date-parts': [[1925]] }, 'container-title': "L'Année sociologique", volume: '1', page: '30–186' },
    daysAgo: 39, tags: ['exchange/gift', 'exchange/reciprocity'], projects: ['ch1'],
    contentSource: 'drive_pdf', drive: { fileId: 'sample-2', fileName: 'mauss-1925.pdf', fileSize: 3_100_000, sha256: null }, pageCount: 157, hasTextLayer: true,
  },
  book('alberti', 'Reciprocidad e intercambio en los Andes peruanos', [['Alberti', 'Giorgio'], ['Mayer', 'Enrique']], 1974, 'Instituto de Estudios Peruanos', 'Lima',
    { daysAgo: 30, modifiedDaysAgo: 6, tags: ['andes/ayni', 'exchange/reciprocity'], projects: ['ch2'] }),
  book('mayer', 'The Articulated Peasant', [['Mayer', 'Enrique']], 2002, 'Westview Press', 'Boulder', { daysAgo: 21, tags: ['andes/feria'], projects: ['ch2'] }),
  book('strathern', 'The Gender of the Gift', [['Strathern', 'Marilyn']], 1988, 'University of California Press', 'Berkeley', { daysAgo: 400, tags: ['exchange/gift', 'to-revisit'], projects: ['ch1'] }),
  book('graeber', 'Toward an Anthropological Theory of Value', [['Graeber', 'David']], 2001, 'Palgrave', 'New York', { daysAgo: 12, tags: ['exchange'], projects: ['sem'] }),
  book('tsing', 'The Mushroom at the End of the World', [['Tsing', 'Anna Lowenhaupt']], 2015, 'Princeton University Press', 'Princeton', { daysAgo: 5, tags: ['exchange/circulation'], projects: ['sem'] }),
  {
    key: 'rosa', kind: 'source', type: 'interview', title: 'Entrevista a Doña R., comerciante de papa',
    csl: { author: [{ literal: 'Doña R.' }], issued: { 'date-parts': [[2026, 3, 14]] } },
    metadata: { interviewer: 'Me', place: 'Feria de Huancayo', language: 'Spanish', length: '48 min' },
    contentSource: 'pasted',
    body: 'E: ¿Desde cuándo vende en la feria?\n\nR: Desde chiquita. Mi mamá vendía acá mismo, en esta esquina.\n\nE: ¿Y cuando alguien no tiene para pagar?\n\nR: Se le fía, pues. Acá nadie fía, dicen, pero todos deben. Es como en la chacra: hoy te ayudo, mañana me ayudas.\n\nE: ¿Eso tiene un nombre?\n\nR: Mi abuela decía ayni.',
    daysAgo: 9, tags: ['andes/feria', 'method'], projects: ['ch2'],
  },
  {
    key: 'diario', kind: 'source', type: 'document', title: 'Diario de campo, feria dominical (marzo 2026)',
    csl: { issued: { 'date-parts': [[2026, 3]] } }, contentSource: 'pasted',
    body: 'Domingo 14. Llegué 6:40, los puestos de papa ya armados. Nadie anota nada, pero todas saben quién debe a quién.\n\nJueves hay minga en la chacra de la comadre.',
    daysAgo: 8, tags: ['andes/feria', 'andes/minga'], projects: ['ch2'],
  },
  {
    key: 'ordenanza', kind: 'source', type: 'archival', title: 'Ordenanza municipal sobre comercio en ferias',
    csl: { author: [{ literal: 'Municipalidad Provincial de Huancayo' }], issued: { 'date-parts': [[2019]] }, archive: 'Archivo municipal', archive_location: 'Caja 14' },
    contentSource: 'drive_pdf', drive: { fileId: 'sample-3', fileName: 'ordenanza-2019.pdf', fileSize: 410_000, sha256: null }, pageCount: 12, hasTextLayer: false,
    daysAgo: 15, tags: ['andes/feria'], projects: ['ch2'],
  },
  {
    key: 'n-kula', kind: 'note', type: 'note', title: 'Kula as circulation, not exchange',
    body: 'Malinowski insists the armshells and necklaces never stop moving.\n\nCompare with [[Ayni vs. the Maussian gift]]. #exchange/kula #exchange/circulation',
    daysAgo: 6, modifiedDaysAgo: 0.002, projects: ['ch1'],
  },
  {
    key: 'n-ayni', kind: 'note', type: 'note', title: 'Ayni vs. the Maussian gift',
    body: 'Ayni returns labour in kind and in time.\n\nSources: [[Reciprocidad e intercambio en los Andes peruanos]], [[Essai sur le don]]. #andes/ayni #exchange/gift #to-revisit',
    daysAgo: 11, modifiedDaysAgo: 1, projects: ['ch1', 'ch2'],
  },
];

/** Notes anchored to a text, by key (the note "is about" that text). */
export const SAMPLE_ANCHORS: Record<string, string> = { 'n-kula': 'malinowski' };

export const SAMPLE_ANNOTATIONS: (Omit<AnnotationDraft, 'itemId'> & { item: string })[] = [
  { item: 'malinowski', kind: 'highlight', color: 1, page: 81, text: 'The Kula is a form of exchange, of extensive, inter-tribal character', quote: { exact: 'The Kula is a form of exchange, of extensive, inter-tribal character', prefix: 'performance. ', suffix: '; it is carried' }, locator: 'p. 81' },
  { item: 'malinowski', kind: 'highlight', color: 3, page: 81, text: 'Each of these articles, as it travels in its own direction on the closed circuit, meets on its way articles of the other class', quote: { exact: 'Each of these articles, as it travels in its own direction on the closed circuit, meets on its way articles of the other class', prefix: 'called mwali. ', suffix: ', and is' }, locator: 'p. 81' },
  { item: 'rosa', kind: 'highlight', color: 3, text: 'Acá nadie fía, dicen, pero todos deben.', quote: { exact: 'Acá nadie fía, dicen, pero todos deben.', prefix: 'Se le fía, pues. ', suffix: ' Es como' }, locator: '¶4' },
];
