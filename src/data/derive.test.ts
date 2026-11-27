import { describe, expect, it } from 'vitest';
import { citekeyBase, deriveFromCsl, nextCitekey } from './derive';

// Same expectations as supabase/tests/core_model_test.sql, so both data layers agree.
describe('deriveFromCsl', () => {
  it('derives year and precision from partial dates', () => {
    expect(deriveFromCsl({ issued: { 'date-parts': [[1922]] } })).toMatchObject({ year: 1922, datePrecision: 'year' });
    expect(deriveFromCsl({ issued: { 'date-parts': [[2019, 3]] } })).toMatchObject({ year: 2019, datePrecision: 'month' });
    expect(deriveFromCsl({ issued: { 'date-parts': [[2026, 3, 14]] } })).toMatchObject({ year: 2026, datePrecision: 'day' });
    expect(deriveFromCsl({})).toMatchObject({ year: null, datePrecision: null });
  });
  it('joins people (authors, then editors, then interviewers) and keeps a sort key', () => {
    const d = deriveFromCsl({ author: [{ family: 'Alberti', given: 'Giorgio' }, { family: 'Mayer', given: 'Enrique' }] });
    expect(d.creatorsText).toBe('Giorgio Alberti; Enrique Mayer');
    expect(d.sortCreator).toBe('alberti');
    expect(deriveFromCsl({ author: [{ literal: 'Doña R.' }] }).sortCreator).toBe('dona r.');
  });
});

describe('citekeys', () => {
  it('builds surnameyear without accents', () => {
    expect(citekeyBase({ author: [{ family: 'Malinowski', given: 'Bronisław' }] }, 'Argonauts', 1922)).toBe('malinowski1922');
    expect(citekeyBase({ author: [{ family: 'Núñez del Prado' }] }, 'x', null)).toBe('nunezdelpradond');
  });
  it('adds b, c… for duplicates, never a', () => {
    expect(nextCitekey('malinowski1922', new Set())).toBe('malinowski1922');
    expect(nextCitekey('malinowski1922', new Set(['malinowski1922']))).toBe('malinowski1922b');
    expect(nextCitekey('malinowski1922', new Set(['malinowski1922', 'malinowski1922b']))).toBe('malinowski1922c');
  });
});
