// Права модератора.
//
// Источник правды — колонка users.is_admin в базе. Управляется скриптами:
//   npm run grant-admin  <telegram-id>
//   npm run revoke-admin <telegram-id>
//
// ADMIN_IDS в .env — необязательный «аварийный» список: эти id считаются
// админами всегда, даже если в базе флаг не проставлен (удобно для первого
// админа и для локальной разработки). Пусто по умолчанию — чтобы обычный
// пользователь НЕ мог модерировать.

import { db } from './db.js';

export const ENV_ADMIN_IDS = new Set(
  String(process.env.ADMIN_IDS || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
);

export function isAdmin(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return false;
  if (ENV_ADMIN_IDS.has(id)) return true;
  const row = db.prepare(`SELECT is_admin FROM users WHERE id = ?`).get(id);
  return row?.is_admin === 1;
}

// Проставить флаг в базе тем, кто указан в ADMIN_IDS и уже заходил в приложение.
export function bootstrapEnvAdmins() {
  for (const id of ENV_ADMIN_IDS) {
    db.prepare(`UPDATE users SET is_admin = 1 WHERE id = ?`).run(id);
  }
}

// Express-миддлвар: пускает дальше только админов.
export function requireAdmin(req, res, next) {
  if (!isAdmin(req.user?.id)) {
    return res.status(403).json({ error: 'только для администраторов' });
  }
  next();
}
