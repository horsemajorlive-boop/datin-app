import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatLastSeen } from './relativeTime';

const NOW = new Date('2026-01-15T12:00:00.000Z').getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('formatLastSeen', () => {
  test('только что — меньше минуты назад', () => {
    expect(formatLastSeen(NOW - 30_000, 'm')).toBe('был в сети только что');
  });

  test('минуты назад', () => {
    expect(formatLastSeen(NOW - 5 * 60_000, 'm')).toBe('был в сети 5 мин назад');
  });

  test('часы назад', () => {
    expect(formatLastSeen(NOW - 3 * 60 * 60_000, 'm')).toBe('был в сети 3 ч назад');
  });

  test('вчера — ровно 24-48ч назад', () => {
    expect(formatLastSeen(NOW - 30 * 60 * 60_000, 'm')).toBe('был в сети вчера');
  });

  test('несколько дней назад', () => {
    expect(formatLastSeen(NOW - 5 * 24 * 60 * 60_000, 'm')).toBe('был в сети 5 дн назад');
  });

  test('женский род меняет окончание глагола', () => {
    expect(formatLastSeen(NOW - 5 * 60_000, 'f')).toBe('была в сети 5 мин назад');
  });

  test('мужской род (или неизвестный) — без окончания "а"', () => {
    expect(formatLastSeen(NOW - 5 * 60_000, 'm')).toBe('был в сети 5 мин назад');
    expect(formatLastSeen(NOW - 5 * 60_000, undefined)).toBe('был в сети 5 мин назад');
  });
});
