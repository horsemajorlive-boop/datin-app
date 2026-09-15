import { describe, test, expect } from 'vitest';
import { assetUrl, normalizeProfile, normalizeMessage } from './api';

describe('assetUrl', () => {
  test('относительный путь /uploads/... остаётся относительным', () => {
    expect(assetUrl('/uploads/abc.jpg')).toBe('/uploads/abc.jpg');
  });

  test('абсолютный https-адрес не трогаем', () => {
    expect(assetUrl('https://picsum.photos/seed/x/400/300')).toBe(
      'https://picsum.photos/seed/x/400/300'
    );
  });

  test('data: URL не трогаем', () => {
    const dataUrl = 'data:image/png;base64,AAAA';
    expect(assetUrl(dataUrl)).toBe(dataUrl);
  });

  test('пустое значение возвращает как есть', () => {
    expect(assetUrl('')).toBe('');
    expect(assetUrl(null)).toBe(null);
  });
});

describe('normalizeProfile', () => {
  test('null/undefined проходит насквозь', () => {
    expect(normalizeProfile(null)).toBe(null);
    expect(normalizeProfile(undefined)).toBe(undefined);
  });

  test('прогоняет каждое фото через assetUrl, остальные поля не трогает', () => {
    const p = { id: 1, name: 'Аня', photos: ['/uploads/1.jpg', '/uploads/2.jpg'] };
    const result = normalizeProfile(p);
    expect(result.id).toBe(1);
    expect(result.name).toBe('Аня');
    expect(result.photos).toEqual(['/uploads/1.jpg', '/uploads/2.jpg']);
  });

  test('анкета без фото (масштаб "кто лайкнул" без Premium) не падает', () => {
    const masked = { id: 5, masked: true, age: 25 };
    expect(normalizeProfile(masked).photos).toEqual([]);
  });
});

describe('normalizeMessage', () => {
  test('фото-сообщение прогоняется через assetUrl', () => {
    const m = { id: 1, type: 'photo', photo: '/uploads/x.jpg' };
    expect(normalizeMessage(m).photo).toBe('/uploads/x.jpg');
  });

  test('текстовое сообщение без фото не трогает поле photo', () => {
    const m = { id: 1, type: 'text', text: 'привет', photo: null };
    expect(normalizeMessage(m).photo).toBe(null);
  });

  test('остальные поля (editedAt/deleted) проходят без изменений', () => {
    const m = { id: 1, type: 'text', text: null, deleted: true, editedAt: null };
    expect(normalizeMessage(m)).toEqual(m);
  });
});
