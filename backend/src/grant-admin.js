// Выдать / снять права модератора.
//
//   node src/grant-admin.js  <telegram-id>          -> сделать админом
//   node src/grant-admin.js  <telegram-id> --revoke -> снять права
//
// (через npm: npm run grant-admin 12345678 / npm run revoke-admin 12345678)

import { db } from './db.js';

const args = process.argv.slice(2);
const revoke = args.includes('--revoke');
const id = Number(args.find((a) => /^\d+$/.test(a)));

if (!Number.isFinite(id) || id <= 0) {
  console.error('Укажите telegram-id: node src/grant-admin.js <id> [--revoke]');
  process.exit(1);
}

const user = db.prepare('SELECT id, first_name FROM users WHERE id = ?').get(id);
if (!user) {
  console.error(
    `Пользователь ${id} не найден. Он должен хотя бы раз открыть приложение, ` +
      'чтобы появилась запись в базе.'
  );
  process.exit(1);
}

db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(revoke ? 0 : 1, id);

console.log(
  `${user.first_name || 'user'} (${id}) — ${revoke ? 'больше НЕ админ' : 'теперь АДМИН'}.`
);
