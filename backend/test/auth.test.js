// Тесты проверки подписи Telegram initData (validateInitData) — это вся
// граница безопасности приложения: кто угодно, кто подделает эту подпись,
// может представиться любым пользователем. Алгоритм подписи и его нюансы
// (сортировка полей, срок годности auth_date) — см. auth.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';

// db.js читает переменные окружения при первом импорте (в т.ч. через
// auth.js -> models.js -> db.js) — направляем на изолированную временную
// базу, чтобы тест не трогал реальную dev-базу (тот же приём, что и в
// src/simulate-boosts.js).
process.env.DB_PATH = path.join(os.tmpdir(), `tiamo-test-auth-${process.pid}.db`);
process.env.BOT_TOKEN = 'test-bot-token-for-unit-tests';

const { validateInitData } = await import('../src/auth.js');

// Собирает initData так же, как это делает настоящий Telegram-клиент —
// повторяет алгоритм подписи из auth.js, чтобы тест не зависел от его
// внутренностей, а проверял поведение "снаружи".
function buildInitData(fields, { badHash = false } = {}) {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.BOT_TOKEN)
    .digest();
  const hash = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');
  params.set('hash', badHash ? 'f'.repeat(64) : hash);
  return params.toString();
}

test('validateInitData принимает корректно подписанные данные', () => {
  const initData = buildInitData({
    user: JSON.stringify({ id: 12345, first_name: 'Тест' }),
    auth_date: String(Math.floor(Date.now() / 1000)),
  });
  const result = validateInitData(initData);
  assert.equal(result?.id, 12345);
  assert.equal(result?.first_name, 'Тест');
});

test('validateInitData отклоняет подделанную подпись', () => {
  const initData = buildInitData(
    {
      user: JSON.stringify({ id: 1 }),
      auth_date: String(Math.floor(Date.now() / 1000)),
    },
    { badHash: true }
  );
  assert.equal(validateInitData(initData), null);
});

test('validateInitData отклоняет протухший auth_date (>24ч)', () => {
  const initData = buildInitData({
    user: JSON.stringify({ id: 1 }),
    auth_date: String(Math.floor(Date.now() / 1000) - 25 * 60 * 60),
  });
  assert.equal(validateInitData(initData), null);
});

test('validateInitData отклоняет данные без hash', () => {
  assert.equal(validateInitData('user=%7B%22id%22%3A1%7D'), null);
});

test('validateInitData отклоняет пустую строку', () => {
  assert.equal(validateInitData(''), null);
});

test('validateInitData ловит подмену поля без пересчёта подписи', () => {
  const initData = buildInitData({
    user: JSON.stringify({ id: 1 }),
    auth_date: String(Math.floor(Date.now() / 1000)),
  });
  // Меняем id прямо в подписанной строке, не трогая hash — так и выглядела
  // бы попытка подмены: подпись больше не сходится с данными.
  const tampered = initData.replace('%22id%22%3A1', '%22id%22%3A999999');
  assert.equal(validateInitData(tampered), null);
});
