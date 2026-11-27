import { describe, expect, it } from 'vitest';
import { authorsShort, foldText, shortLabel, smartDate, splitSnippet, trimLabel } from './format';

describe('authorsShort', () => {
  it('follows the spec: one, two, three or more authors', () => {
    expect(authorsShort({ author: [{ family: 'Malinowski', given: 'Bronisław' }] })).toBe('Malinowski');
    expect(authorsShort({ author: [{ family: 'Alberti' }, { family: 'Mayer' }] })).toBe('Alberti & Mayer');
    expect(authorsShort({ author: [{ family: 'Mayer' }, { family: 'B' }, { family: 'C' }] })).toBe('Mayer et al.');
  });
  it('uses literal names (aliases) and falls back to editors, then interviewers', () => {
    expect(authorsShort({ author: [{ literal: 'Doña R.' }] })).toBe('Doña R.');
    expect(authorsShort({ editor: [{ family: 'Strathern' }] })).toBe('Strathern');
    expect(authorsShort({})).toBe('');
  });
});

describe('trimLabel and shortLabel', () => {
  it('adds … only when it actually cuts', () => {
    expect(trimLabel('Malinowski')).toBe('Malinowski');
    expect(trimLabel('Alberti & Mayer')).toBe('Alberti & Mayer'); // exactly 15
    expect(trimLabel('Municipalidad Provincial')).toBe('Municipalidad P…');
  });
  it('labels texts as "author, year" and notes by title', () => {
    expect(shortLabel({ kind: 'bibliography', title: 'Argonauts', year: 1922, csl: { author: [{ family: 'Malinowski' }] } }))
      .toBe('Malinowski, 1922');
    expect(shortLabel({ kind: 'note', title: 'Kula as circulation, not exchange', year: null, csl: {} }))
      .toBe('Kula as circula…');
    expect(shortLabel({ kind: 'source', title: 'Precios de la feria', year: 2019, csl: {} })).toBe('Precios de la f…');
  });
});

describe('smartDate', () => {
  const now = new Date(2026, 10, 27, 15, 0); // Fri 27 Nov 2026, 15:00
  it('shows time today, "yesterday", weekday this week, day+month this year, full date before', () => {
    expect(smartDate(new Date(2026, 10, 27, 9, 5), 'en-GB', 'Yesterday', now)).toBe('09:05');
    expect(smartDate(new Date(2026, 10, 26, 23, 0), 'en-GB', 'Yesterday', now)).toBe('Yesterday');
    expect(smartDate(new Date(2026, 10, 23, 12, 0), 'en-GB', 'Yesterday', now)).toBe('Mon');
    expect(smartDate(new Date(2026, 2, 12, 12, 0), 'en-GB', 'Yesterday', now)).toBe('12 Mar');
    expect(smartDate(new Date(2024, 2, 12, 12, 0), 'en-GB', 'Yesterday', now)).toBe('12 Mar 2024');
  });
  it('uses the translated word for yesterday', () => {
    expect(smartDate(new Date(2026, 10, 26, 8, 0), 'es', 'Ayer', now)).toBe('Ayer');
  });
});

describe('splitSnippet', () => {
  it('splits search snippets into plain and matched parts', () => {
    expect(splitSnippet('The ⟦Kula⟧ is a form of ⟦exchange⟧')).toEqual([
      { text: 'The ', match: false },
      { text: 'Kula', match: true },
      { text: ' is a form of ', match: false },
      { text: 'exchange', match: true },
    ]);
  });
  it('keeps HTML as plain text', () => {
    expect(splitSnippet('<b>x</b> ⟦y⟧')).toEqual([
      { text: '<b>x</b> ', match: false },
      { text: 'y', match: true },
    ]);
  });
});

describe('foldText', () => {
  it('removes accents like the database does, including letters such as ł, ø, æ, ß', () => {
    expect(foldText('Bronisław')).toBe('bronislaw');
    expect(foldText('Reciprocidád Andina')).toBe('reciprocidad andina');
    expect(foldText('Søren Kierkegaard')).toBe('soren kierkegaard');
    expect(foldText('Straße, Æsir, cœur')).toBe('strasse, aesir, coeur');
  });
});
