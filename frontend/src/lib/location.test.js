import { describe, test, expect } from 'vitest';
import { formatDistance, cityWithDistance } from './location';

describe('formatDistance', () => {
  test('null/undefined — пустая строка', () => {
    expect(formatDistance(null)).toBe('');
    expect(formatDistance(undefined)).toBe('');
  });

  test('меньше 1 км — "рядом"', () => {
    expect(formatDistance(0)).toBe('рядом');
  });

  test('обычное значение — "N км"', () => {
    expect(formatDistance(42)).toBe('42 км');
  });
});

describe('cityWithDistance', () => {
  test('и город, и расстояние — вместе через точку', () => {
    expect(cityWithDistance('Сочи', 4)).toBe('Сочи · 4 км');
  });

  test('только город', () => {
    expect(cityWithDistance('Сочи', null)).toBe('Сочи');
  });

  test('только расстояние', () => {
    expect(cityWithDistance('', 4)).toBe('4 км');
  });

  test('ничего нет — пустая строка', () => {
    expect(cityWithDistance('', null)).toBe('');
  });
});
