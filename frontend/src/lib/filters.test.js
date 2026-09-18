import { describe, test, expect, beforeEach } from 'vitest';
import {
  DEFAULT_FILTERS,
  clampAge,
  loadFilters,
  saveFilters,
  buildFeedQuery,
  isFilterActive,
} from './filters';

beforeEach(() => {
  localStorage.clear();
});

describe('clampAge', () => {
  test('пустое значение остаётся пустым', () => {
    expect(clampAge('')).toBe('');
    expect(clampAge(null)).toBe('');
  });

  test('нечисловое значение превращается в пустую строку', () => {
    expect(clampAge('abc')).toBe('');
  });

  test('обрезает снизу до 18', () => {
    expect(clampAge('5')).toBe('18');
  });

  test('обрезает сверху до 100', () => {
    expect(clampAge('250')).toBe('100');
  });

  test('корректное значение не трогает', () => {
    expect(clampAge('25')).toBe('25');
  });

  test('округляет дробные значения', () => {
    expect(clampAge('25.7')).toBe('26');
  });
});

describe('loadFilters/saveFilters', () => {
  test('без сохранённых данных возвращает значения по умолчанию', () => {
    expect(loadFilters()).toEqual(DEFAULT_FILTERS);
  });

  test('сохранённые фильтры перекрывают значения по умолчанию', () => {
    saveFilters({ ...DEFAULT_FILTERS, city: 'Москва', ageMin: '25' });
    expect(loadFilters()).toEqual({ ...DEFAULT_FILTERS, city: 'Москва', ageMin: '25' });
  });

  test('битый JSON в localStorage не роняет loadFilters', () => {
    localStorage.setItem('feed-filters', '{не json');
    expect(loadFilters()).toEqual(DEFAULT_FILTERS);
  });
});

describe('buildFeedQuery', () => {
  test('фильтры по умолчанию дают только sort=simple (его нужно слать явно)', () => {
    expect(buildFeedQuery(DEFAULT_FILTERS)).toBe('?sort=simple');
  });

  test('возраст всегда проходит через clampAge (младше 18 не уйдёт в запрос)', () => {
    const q = buildFeedQuery({ ...DEFAULT_FILTERS, ageMin: '10' });
    expect(q).toContain('ageMin=18');
  });

  test('собирает несколько параметров вместе', () => {
    const q = buildFeedQuery({
      ...DEFAULT_FILTERS,
      city: 'Сочи',
      gender: 'f',
      housing: ['own', 'rent'],
      verified: true,
    });
    const params = new URLSearchParams(q.slice(1));
    expect(params.get('city')).toBe('Сочи');
    expect(params.get('gender')).toBe('f');
    expect(params.get('housing')).toBe('own,rent');
    expect(params.get('verified')).toBe('1');
  });

  test('пробелы в городе обрезаются, пустой город не попадает в запрос', () => {
    expect(buildFeedQuery({ ...DEFAULT_FILTERS, city: '   ' })).toBe('?sort=simple');
  });
});

describe('isFilterActive', () => {
  test('false для фильтров по умолчанию (в т.ч. sort: "simple")', () => {
    expect(isFilterActive(DEFAULT_FILTERS)).toBe(false);
  });

  test('true, если задан хотя бы один фильтр', () => {
    expect(isFilterActive({ ...DEFAULT_FILTERS, sort: 'new' })).toBe(true);
  });

  test('true, если явно выбрана сортировка "Сейчас активны" (sort: "") — она больше не дефолт', () => {
    expect(isFilterActive({ ...DEFAULT_FILTERS, sort: '' })).toBe(true);
  });
});
