import { describe, test, expect } from 'vitest';
import { computeProfileStrength } from './profileStrength';

const EMPTY_PROFILE = {
  photos: [],
  interests: [],
  bio: '',
  smoking: '',
  drinking: '',
  city: '',
  height: null,
  kids: '',
};

const FULL_PROFILE = {
  photos: ['a.jpg', 'b.jpg'],
  interests: ['1', '2', '3', '4', '5', '6'],
  bio: 'Привет!',
  smoking: 'no',
  drinking: 'no',
  city: 'Москва',
  height: 175,
  kids: 'maybe',
};

describe('computeProfileStrength', () => {
  test('полностью пустая анкета — 0%, всё в missing', () => {
    const { percent, missing } = computeProfileStrength(EMPTY_PROFILE);
    expect(percent).toBe(0);
    expect(missing.length).toBe(7);
  });

  test('полностью заполненная анкета — 100%, missing пуст', () => {
    const { percent, missing } = computeProfileStrength(FULL_PROFILE);
    expect(percent).toBe(100);
    expect(missing).toEqual([]);
  });

  test('missing отсортирован по весу пункта по убыванию', () => {
    const { missing } = computeProfileStrength(EMPTY_PROFILE);
    for (let i = 1; i < missing.length; i++) {
      expect(missing[i - 1].weight).toBeGreaterThanOrEqual(missing[i].weight);
    }
  });

  test('одно фото не считается за "хватает фото" (нужно минимум 2)', () => {
    const { missing } = computeProfileStrength({ ...FULL_PROFILE, photos: ['a.jpg'] });
    expect(missing.some((m) => m.key === 'photos')).toBe(true);
  });

  test('ровно 5 интересов ещё не считается "много" (нужно строго больше 5)', () => {
    const { missing } = computeProfileStrength({
      ...FULL_PROFILE,
      interests: ['1', '2', '3', '4', '5'],
    });
    expect(missing.some((m) => m.key === 'interests')).toBe(true);
  });

  test('bio из одних пробелов не считается заполненным', () => {
    const { missing } = computeProfileStrength({ ...FULL_PROFILE, bio: '   ' });
    expect(missing.some((m) => m.key === 'bio')).toBe(true);
  });
});
