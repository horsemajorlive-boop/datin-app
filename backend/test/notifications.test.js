// Тесты текста и гейтинга пушей (notifications.js). BOT_TOKEN нарочно не
// задан — тогда notify() (см. notify.js) просто пишет в console.log вместо
// реального похода в Telegram API, синхронно и без сети — этим и пользуемся:
// перехватываем console.log вместо мока HTTP. isConnected в тестовом процессе
// всегда false (реальных WebSocket-клиентов тут нет) — значит away() всегда
// true, и единственное, что здесь можно и нужно проверить — гейтинг по
// настройкам notify_* и содержимое текста, а не "поймали ли онлайн".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

process.env.DB_PATH = path.join(os.tmpdir(), `tiamo-test-notifications-${process.pid}.db`);
delete process.env.BOT_TOKEN;

const model = await import('../src/models.js');
const { db } = await import('../src/db.js');
const notifications = await import('../src/notifications.js');

let nextId = 700000;
function makeUser(overrides = {}) {
  const id = nextId++;
  model.upsertUser({ id, first_name: `User${id}`, username: null });
  model.saveProfile(id, {
    name: `User${id}`,
    age: 25,
    city: 'Москва',
    gender: 'f',
    bio: '',
    interests: ['A', 'B', 'C', 'D', 'E'],
    housing: 'rent',
    car: 'no',
    employment: 'working',
    goal: 'relationship',
    kids: 'maybe',
    ...overrides,
  });
  return id;
}

// Перехватывает console.log за время выполнения fn и возвращает собранные строки.
function captureLogs(fn) {
  const lines = [];
  const orig = console.log;
  console.log = (...args) => lines.push(args.join(' '));
  try {
    fn();
  } finally {
    console.log = orig;
  }
  return lines;
}

test.after(() => {
  db.close();
  fs.rmSync(process.env.DB_PATH, { force: true });
});

test('notifyNewLike шлёт обычный текст и уважает notify_likes', () => {
  const actor = makeUser();
  const target = makeUser();

  const logs = captureLogs(() => notifications.notifyNewLike(actor, target));
  assert.equal(logs.length, 1);
  assert.match(logs[0], /Вы кому-то понравились/);

  model.updateSettings(target, { notifyLikes: false });
  const silent = captureLogs(() => notifications.notifyNewLike(actor, target));
  assert.equal(silent.length, 0);
});

test('notifyNewSuperlike включает имя и превью сообщения, уважает notify_superlikes', () => {
  const actor = makeUser({ name: 'Соня' });
  const target = makeUser();

  const withMsg = captureLogs(() =>
    notifications.notifyNewSuperlike(actor, target, 'Привет! Классная анкета')
  );
  assert.equal(withMsg.length, 1);
  assert.match(withMsg[0], /Соня/);
  assert.match(withMsg[0], /Привет! Классная анкета/);

  const withoutMsg = captureLogs(() => notifications.notifyNewSuperlike(actor, target, ''));
  assert.equal(withoutMsg.length, 1);
  assert.doesNotMatch(withoutMsg[0], /«»/);

  model.updateSettings(target, { notifySuperlikes: false });
  const silent = captureLogs(() =>
    notifications.notifyNewSuperlike(actor, target, 'Привет ещё раз')
  );
  assert.equal(silent.length, 0);
});

test('notifyNewSuperlike обрезает длинное сообщение до SUPERLIKE_PREVIEW_LEN с многоточием', () => {
  const actor = makeUser();
  const target = makeUser();
  const long = 'x'.repeat(200);

  const logs = captureLogs(() => notifications.notifyNewSuperlike(actor, target, long));
  assert.equal(logs.length, 1);
  const expectedPreview = 'x'.repeat(notifications.SUPERLIKE_PREVIEW_LEN) + '…';
  assert.ok(logs[0].includes(expectedPreview));
  assert.ok(!logs[0].includes('x'.repeat(notifications.SUPERLIKE_PREVIEW_LEN + 1)));
});

test('notifyMutualSuperlike шлёт РАЗНЫЙ текст суперлайкеру и тому, кто ответил взаимностью', () => {
  const superliker = makeUser({ name: 'Автор' });
  const reciprocator = makeUser({ name: 'Ответивший' });

  const logs = captureLogs(() => notifications.notifyMutualSuperlike(superliker, reciprocator));
  assert.equal(logs.length, 2);

  // текст суперлайкеру упоминает "взаимностью", текст ответившему — обычный "Новый мэтч"
  const mutualLine = logs.find((l) => /ответил\(а\) взаимностью/.test(l));
  const matchLine = logs.find((l) => /Новый мэтч/.test(l));
  assert.ok(mutualLine, 'должен быть текст про взаимность для автора суперлайка');
  assert.ok(matchLine, 'должен быть обычный текст мэтча для ответившего');
  assert.match(mutualLine, /Ответивший/); // автору сообщают имя того, кто ответил
  assert.match(matchLine, /Автор/); // ответившему сообщают имя автора суперлайка
});

test('notifyMutualSuperlike уважает notify_matches у каждой стороны независимо', () => {
  const superliker = makeUser();
  const reciprocator = makeUser();
  model.updateSettings(superliker, { notifyMatches: false });

  const logs = captureLogs(() => notifications.notifyMutualSuperlike(superliker, reciprocator));
  assert.equal(logs.length, 1); // только ответившему, автору с выключенными матчами — тишина
});

test('notifyNewMatch персонализирует текст под каждую сторону и уважает notify_matches', () => {
  const a = makeUser({ name: 'Аня' });
  const b = makeUser({ name: 'Боря' });

  const logs = captureLogs(() => notifications.notifyNewMatch(a, b));
  assert.equal(logs.length, 2);
  assert.ok(logs.some((l) => l.includes('Боря'))); // для Ани — имя Бори
  assert.ok(logs.some((l) => l.includes('Аня'))); // для Бори — имя Ани

  model.updateSettings(a, { notifyMatches: false });
  const partial = captureLogs(() => notifications.notifyNewMatch(a, b));
  assert.equal(partial.length, 1);
});

test('notifyNewMessage шлёт только партнёру по мэтчу и уважает notify_messages', () => {
  const a = makeUser();
  const b = makeUser();
  model.recordSwipe(a, b, 'like');
  const { matchId } = model.recordSwipe(b, a, 'like');
  assert.ok(matchId);

  const logs = captureLogs(() => notifications.notifyNewMessage(matchId, a));
  assert.equal(logs.length, 1);
  assert.match(logs[0], /Новое сообщение/);

  model.updateSettings(b, { notifyMessages: false });
  const silent = captureLogs(() => notifications.notifyNewMessage(matchId, a));
  assert.equal(silent.length, 0);
});
