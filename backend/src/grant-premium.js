// Выдать / снять Premium вручную — пока не подключена реальная оплата
// (или просто для локального теста).
//
//   node src/grant-premium.js <telegram-id> [дней]     -> выдать (по умолчанию 30 дней)
//   node src/grant-premium.js <telegram-id> --revoke   -> снять досрочно
//
// (через npm: npm run grant-premium 12345678 30 / npm run revoke-premium 12345678)

import { db } from './db.js';
import { grantPremium, PREMIUM_DAYS } from './models.js';

const args = process.argv.slice(2);
const revoke = args.includes('--revoke');
const numericArgs = args.filter((a) => /^\d+$/.test(a));
const id = Number(numericArgs[0]);
const days = Number(numericArgs[1]) || PREMIUM_DAYS;

if (!Number.isFinite(id) || id <= 0) {
  console.error('Укажите telegram-id: node src/grant-premium.js <id> [дней] [--revoke]');
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

if (revoke) {
  db.prepare('UPDATE users SET premium_until = NULL WHERE id = ?').run(id);
  console.log(`${user.first_name || 'user'} (${id}) — Premium снят.`);
} else {
  const until = grantPremium(id, days);
  console.log(
    `${user.first_name || 'user'} (${id}) — Premium до ${new Date(until).toLocaleString('ru-RU')}.`
  );
}
