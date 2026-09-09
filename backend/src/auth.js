// Авторизация через Telegram Mini App.
//
// Когда мини-приложение открыто в Telegram, оно получает строку initData —
// это данные о пользователе, ПОДПИСАННЫЕ секретным ключом, полученным из
// токена вашего бота. Сервер повторяет ту же подпись и сравнивает.
// Подделать её без токена бота нельзя.
//
// Алгоритм (из документации Telegram):
//   1. Разбираем initData как query-строку, вынимаем поле hash.
//   2. Остальные поля сортируем и склеиваем строками "key=value" через \n.
//   3. secret = HMAC_SHA256(key="WebAppData", message=BOT_TOKEN)
//   4. ourHash = HMAC_SHA256(key=secret, message=строка из шага 2)
//   5. Совпало с hash — данные настоящие.

import crypto from 'node:crypto';
import { upsertUser } from './models.js';

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const DEV_AUTH = process.env.ALLOW_DEV_AUTH === 'true';
const MAX_AGE_SECONDS = 24 * 60 * 60; // initData старше суток не принимаем

export function validateInitData(initData) {
  if (!initData || !BOT_TOKEN) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();

  const ourHash = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  if (ourHash !== hash) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SECONDS) return null;

  try {
    return JSON.parse(params.get('user')); // { id, first_name, username, ... }
  } catch {
    return null;
  }
}

// Express-миддлвар: кладёт проверенного пользователя в req.user или отвечает 401.
export function requireAuth(req, res, next) {
  // Фронтенд шлёт: Authorization: tma <initData>
  const header = req.get('authorization') || '';
  const initData = header.toLowerCase().startsWith('tma ')
    ? header.slice(4)
    : req.get('x-init-data') || '';

  let user = validateInitData(initData);

  // Запасной вход только для локальной разработки (ALLOW_DEV_AUTH=true).
  if (!user && DEV_AUTH) {
    const id = Number(req.get('x-dev-user') || 1);
    user = { id, first_name: `Dev ${id}`, username: `dev${id}` };
  }

  if (!user || !user.id) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  upsertUser(user); // заводим/обновляем запись в users
  req.user = user;
  next();
}
