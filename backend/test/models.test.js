// Тесты ключевой бизнес-логики (models.js): свайпы/мэтчи, дневные лимиты,
// Premium, буст, разматчивание, маскировка чужих данных без Premium.
// Работает на ИЗОЛИРОВАННОЙ временной базе (см. DB_PATH ниже) — тот же
// приём, что и в src/simulate-boosts.js, реальную dev-базу не трогает.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

process.env.DB_PATH = path.join(os.tmpdir(), `tiamo-test-models-${process.pid}.db`);

const model = await import('../src/models.js');
const { db } = await import('../src/db.js');

// Быстро создать полноценного (видимого в ленте) пользователя с анкетой.
let nextId = 500000;
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

test.after(() => {
  db.close();
  fs.rmSync(process.env.DB_PATH, { force: true });
});

// ---------- свайпы и мэтчи ----------

test('взаимный лайк создаёт мэтч, односторонний — нет', () => {
  const a = makeUser();
  const b = makeUser();

  const first = model.recordSwipe(a, b, 'like');
  assert.equal(first.match, false);

  const second = model.recordSwipe(b, a, 'like');
  assert.equal(second.match, true);
  assert.ok(second.matchId);

  assert.deepEqual(model.matchUsers(second.matchId).sort(), [a, b].sort());
});

test('пропуск (pass) не создаёт мэтч даже во взаимном случае', () => {
  const a = makeUser();
  const b = makeUser();
  model.recordSwipe(a, b, 'pass');
  const res = model.recordSwipe(b, a, 'pass');
  assert.equal(res.match, false);
});

test('заблокированные не матчатся, даже если оба уже лайкнули', () => {
  const a = makeUser();
  const b = makeUser();
  model.recordSwipe(a, b, 'like');
  model.blockUser(a, b);
  const res = model.recordSwipe(b, a, 'like');
  assert.equal(res.match, false);
});

// ---------- дневные лимиты ----------

test('обычный пользователь упирается в дневной лимит лайков', () => {
  const actor = makeUser();
  let lastResult;
  for (let i = 0; i < model.DAILY_LIKE_LIMIT + 1; i++) {
    const target = makeUser();
    lastResult = model.recordSwipe(actor, target, 'like');
  }
  assert.equal(lastResult.error, 'like_limit');
});

test('Premium снимает лимит обычных лайков', () => {
  const actor = makeUser();
  model.grantPremium(actor, 30);
  let lastResult;
  for (let i = 0; i < model.DAILY_LIKE_LIMIT + 5; i++) {
    const target = makeUser();
    lastResult = model.recordSwipe(actor, target, 'like');
  }
  assert.notEqual(lastResult.error, 'like_limit');
});

test('суперлайк ограничен отдельно от обычных лайков', () => {
  const actor = makeUser();
  const t1 = makeUser();
  const t2 = makeUser();
  const first = model.recordSwipe(actor, t1, 'like', { isSuper: true });
  assert.notEqual(first.error, 'superlike_limit');
  const second = model.recordSwipe(actor, t2, 'like', { isSuper: true });
  assert.equal(second.error, 'superlike_limit'); // DAILY_SUPERLIKE_LIMIT = 1
});

// ---------- Premium ----------

test('grantPremium продлевает от текущей даты окончания, а не от "сейчас"', () => {
  const user = makeUser();
  const firstUntil = model.grantPremium(user, 10);
  const secondUntil = model.grantPremium(user, 10);
  const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
  assert.equal(secondUntil, firstUntil + tenDaysMs);
});

test('isPremium возвращает false после истечения', () => {
  const user = makeUser();
  assert.equal(model.isPremium(user), false);
  model.grantPremium(user, 30);
  assert.equal(model.isPremium(user), true);
});

// ---------- отмена свайпа и разматчивание ----------

test('undoSwipe без Premium отклоняется', () => {
  const actor = makeUser();
  const target = makeUser();
  model.recordSwipe(actor, target, 'pass');
  const res = model.undoSwipe(actor, target);
  assert.equal(res.error, 'premium_required');
});

test('undoSwipe с Premium удаляет свайп и связанный мэтч', () => {
  const a = makeUser();
  const b = makeUser();
  model.grantPremium(a, 30);
  model.recordSwipe(a, b, 'like');
  const { matchId } = model.recordSwipe(b, a, 'like');
  assert.ok(matchId);

  const res = model.undoSwipe(a, b);
  assert.deepEqual(res, { ok: true });
  assert.equal(model.partnerOf(matchId, a), null); // мэтча больше нет
});

test('unmatch: чужой человек не может разматчить чужой мэтч', () => {
  const a = makeUser();
  const b = makeUser();
  const stranger = makeUser();
  model.recordSwipe(a, b, 'like');
  const { matchId } = model.recordSwipe(b, a, 'like');

  assert.equal(model.unmatch(matchId, stranger), null);
});

test('unmatch удаляет мэтч, но сохраняет свайпы (человек не должен вернуться в ленту)', () => {
  const a = makeUser();
  const b = makeUser();
  model.recordSwipe(a, b, 'like');
  const { matchId } = model.recordSwipe(b, a, 'like');

  const res = model.unmatch(matchId, a);
  assert.deepEqual(res, { ok: true });
  assert.equal(model.partnerOf(matchId, a), null);

  // свайп остался — цель по-прежнему исключена из getFeed
  const feed = model.getFeed(a, { limit: 50 });
  assert.ok(!feed.some((p) => p.id === b));
});

// ---------- буст ----------

test('буст недоступен без Premium', () => {
  const user = makeUser();
  const res = model.boostProfile(user);
  assert.equal(res.error, 'not_premium');
});

test('буст ограничен дневным лимитом даже для Premium', () => {
  const user = makeUser();
  model.grantPremium(user, 30);
  for (let i = 0; i < model.PREMIUM_DAILY_BOOST_LIMIT; i++) {
    const ok = model.boostProfile(user);
    assert.ok(ok.boostedUntil, `буст №${i + 1} должен пройти`);
  }
  const over = model.boostProfile(user);
  assert.equal(over.error, 'boost_limit');
});

test('поднятая анкета оказывается в приоритетной группе выдачи', () => {
  const viewer = makeUser();
  const boosted = makeUser();
  model.grantPremium(boosted, 30);
  model.boostProfile(boosted);

  // ещё 10 обычных (небустнутых) анкет для контраста
  for (let i = 0; i < 10; i++) makeUser();

  const feed = model.getFeed(viewer, { limit: 50 });
  const boostedProfile = feed.find((p) => p.id === boosted);
  assert.ok(boostedProfile?.isBoosted);
});

// ---------- маскировка без Premium ----------

test('getIncomingLikes скрывает личность без Premium', () => {
  const liker = makeUser();
  const me = makeUser();
  model.recordSwipe(liker, me, 'like');

  const masked = model.getIncomingLikes(me);
  assert.equal(masked.length, 1);
  assert.equal(masked[0].masked, true);
  assert.equal(masked[0].name, undefined);

  model.grantPremium(me, 30);
  const full = model.getIncomingLikes(me);
  assert.equal(full[0].masked, undefined);
  assert.ok(full[0].name);
});

// ---------- суперлайки с сообщением ----------

test('суперлайк с сообщением попадает в getPendingSuperlikes НЕ замаскированным без Premium', () => {
  const actor = makeUser();
  const me = makeUser();
  model.recordSwipe(actor, me, 'like', { isSuper: true, message: '  Привет! Отличная анкета  ' });

  const pending = model.getPendingSuperlikes(me);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].masked, undefined);
  assert.ok(pending[0].name);
  assert.equal(pending[0].superlikeMessage, 'Привет! Отличная анкета');
});

test('сообщение суперлайка обрезается до SUPERLIKE_MESSAGE_MAX_LEN', () => {
  const actor = makeUser();
  const me = makeUser();
  const long = 'x'.repeat(500);
  model.recordSwipe(actor, me, 'like', { isSuper: true, message: long });

  const pending = model.getPendingSuperlikes(me);
  assert.equal(pending[0].superlikeMessage.length, model.SUPERLIKE_MESSAGE_MAX_LEN);
});

test('обычный лайк не пишет сообщение, даже если оно передано', () => {
  const actor = makeUser();
  const me = makeUser();
  model.recordSwipe(actor, me, 'like', { message: 'тайное послание' });

  const pending = model.getPendingSuperlikes(me);
  assert.equal(pending.length, 0); // это не суперлайк — в списке его нет
});

test('respondToSuperlike создаёт мэтч без Premium и без учёта дневного лимита лайков', () => {
  const actor = makeUser();
  const me = makeUser();
  model.recordSwipe(actor, me, 'like', { isSuper: true, message: 'Привет!' });

  // исчерпываем обычный дневной лимит лайков у "me"
  for (let i = 0; i < model.DAILY_LIKE_LIMIT; i++) {
    model.recordSwipe(me, makeUser(), 'like');
  }

  const res = model.respondToSuperlike(me, actor);
  assert.equal(res.match, true);
  assert.ok(res.matchId);
  assert.deepEqual(model.matchUsers(res.matchId).sort(), [actor, me].sort());

  // и пропадает из ожидающих
  assert.equal(model.getPendingSuperlikes(me).length, 0);
});

test('respondToSuperlike возвращает ошибку, если суперлайка не было', () => {
  const actor = makeUser();
  const me = makeUser();
  const res = model.respondToSuperlike(me, actor);
  assert.equal(res.error, 'not_found');
});

test('пропуск суперлайкнувшего убирает его из getPendingSuperlikes', () => {
  const actor = makeUser();
  const me = makeUser();
  model.recordSwipe(actor, me, 'like', { isSuper: true, message: 'Привет!' });
  model.recordSwipe(me, actor, 'pass');
  assert.equal(model.getPendingSuperlikes(me).length, 0);
});

// ---------- остывание пропусков ----------

test('свежий пропуск скрывает анкету из ленты', () => {
  const me = makeUser();
  const passed = makeUser();
  const now = Date.now();
  model.recordSwipe(me, passed, 'pass');

  const feed = model.getFeed(me, { limit: 50, now });
  assert.ok(!feed.some((p) => p.id === passed));
});

test('обычный пользователь: пропуск "остывает" через PASS_EXPIRY_HOURS и анкета возвращается в ленту', () => {
  const me = makeUser();
  const passed = makeUser();
  const now = Date.now();
  model.recordSwipe(me, passed, 'pass', { now });

  const stillHidden = model.getFeed(me, {
    limit: 50,
    now: now + (model.PASS_EXPIRY_HOURS * 60 * 60 * 1000) / 2,
  });
  assert.ok(!stillHidden.some((p) => p.id === passed));

  const afterExpiry = model.getFeed(me, {
    limit: 50,
    now: now + model.PASS_EXPIRY_HOURS * 60 * 60 * 1000 + 1000,
  });
  assert.ok(afterExpiry.some((p) => p.id === passed));
});

test('Premium: окно остывания пропуска короче (PREMIUM_PASS_EXPIRY_HOURS)', () => {
  const me = makeUser();
  model.grantPremium(me, 30);
  const passed = makeUser();
  const now = Date.now();
  model.recordSwipe(me, passed, 'pass', { now });

  // после обычного (не премиумного) окна анкета уже должна вернуться
  const afterPremiumWindow = model.getFeed(me, {
    limit: 50,
    now: now + model.PREMIUM_PASS_EXPIRY_HOURS * 60 * 60 * 1000 + 1000,
  });
  assert.ok(afterPremiumWindow.some((p) => p.id === passed));
});

test('лайк, в отличие от пропуска, скрывает анкету из ленты навсегда', () => {
  const me = makeUser();
  const liked = makeUser();
  const now = Date.now();
  model.recordSwipe(me, liked, 'like', { now });

  const farFuture = model.getFeed(me, {
    limit: 50,
    now: now + 365 * 24 * 60 * 60 * 1000,
  });
  assert.ok(!farFuture.some((p) => p.id === liked));
});

// ---------- блокировки ----------

test('blockUser рвёт существующие свайпы и мэтч в обе стороны', () => {
  const a = makeUser();
  const b = makeUser();
  model.recordSwipe(a, b, 'like');
  const { matchId } = model.recordSwipe(b, a, 'like');

  model.blockUser(a, b);
  assert.equal(model.isBlockedEitherWay(a, b), true);
  assert.equal(model.isBlockedEitherWay(b, a), true);
  assert.equal(model.partnerOf(matchId, a), null);
});

// ---------- соцсети в анкете ----------

test('себе видно ник и переключатель соцсети независимо от show_*', () => {
  const me = makeUser({ telegram: '@my_nick', showTelegram: false });
  const full = model.getFullProfile(me);
  assert.equal(full.telegram, 'my_nick'); // "@" на сохранении обрезается
  assert.equal(full.showTelegram, false);
});

test('другому видно ник соцсети только если владелец включил показ', () => {
  const hidden = makeUser({ telegram: 'secret', showTelegram: false });
  const shown = makeUser({ telegram: 'open', showTelegram: true });

  assert.equal(model.getFullProfile(hidden, { forOther: true }).telegram, '');
  assert.equal(model.getFullProfile(shown, { forOther: true }).telegram, 'open');
});

test('в ленте (getFeed) соцсети замаскированы так же, как в getFullProfile', () => {
  const viewer = makeUser();
  const withHidden = makeUser({ instagram: 'secret', showInstagram: false });
  const withShown = makeUser({ vk: 'https://vk.com/open', showVk: true });

  const feed = model.getFeed(viewer, { limit: 50 });
  assert.equal(feed.find((p) => p.id === withHidden)?.instagram, '');
  assert.equal(feed.find((p) => p.id === withShown)?.vk, 'https://vk.com/open');
});

test('ник Telegram/Instagram чистится: без "@" и посторонних символов', () => {
  const me = makeUser({ telegram: '  @Мой Ник!! 123 ', showTelegram: true });
  // кириллица, пробелы и "!" не входят в разрешённый набор — вырезаются
  assert.equal(model.getFullProfile(me).telegram, '123');
});

test('ссылка VK без протокола получает https://, опасная схема обезврежена', () => {
  const withoutProtocol = makeUser({ vk: 'vk.com/id1' });
  assert.equal(model.getFullProfile(withoutProtocol).vk, 'https://vk.com/id1');

  const malicious = makeUser({ vk: 'javascript:alert(1)' });
  assert.equal(
    model.getFullProfile(malicious).vk,
    'https://javascript:alert(1)' // не исполняемая схема — просто мусорный адрес
  );
});

// ---------- настройки уведомлений ----------

test('notifySuperlikes включён по умолчанию, updateSettings и getNotifyPrefs меняют его независимо от остальных', () => {
  const user = makeUser();
  assert.equal(model.getFullProfile(user).notifySuperlikes, true);
  assert.equal(model.getNotifyPrefs(user).superlikes, true);

  model.updateSettings(user, { notifySuperlikes: false });
  assert.equal(model.getFullProfile(user).notifySuperlikes, false);
  assert.equal(model.getNotifyPrefs(user).superlikes, false);
  // остальные настройки уведомлений не затронуты
  assert.equal(model.getNotifyPrefs(user).likes, true);
  assert.equal(model.getNotifyPrefs(user).matches, true);
});

// ---------- напоминание об истечении Premium ----------

test('getPremiumExpiringSoon находит только тех, кто в окне предупреждения, и не дублирует после отметки', () => {
  const soon = makeUser();
  const farAway = makeUser();
  const already = makeUser();

  model.grantPremium(soon, 0); // считаем ниже вручную
  db.prepare('UPDATE users SET premium_until = ? WHERE id = ?').run(
    Date.now() + 5 * 60 * 60 * 1000, // через 5 часов — попадает в окно 24ч
    soon
  );
  db.prepare('UPDATE users SET premium_until = ? WHERE id = ?').run(
    Date.now() + 10 * 24 * 60 * 60 * 1000, // через 10 дней — не попадает
    farAway
  );
  db.prepare(
    'UPDATE users SET premium_until = ?, premium_expiry_notified_until = ? WHERE id = ?'
  ).run(Date.now() + 5 * 60 * 60 * 1000, Date.now() + 5 * 60 * 60 * 1000, already);

  const due = model.getPremiumExpiringSoon().map((r) => r.userId);
  assert.ok(due.includes(soon));
  assert.ok(!due.includes(farAway));
  assert.ok(!due.includes(already)); // уже отмечен для этой даты истечения

  const row = model.getPremiumExpiringSoon().find((r) => r.userId === soon);
  model.markPremiumExpiryNotified(soon, row.premiumUntil);
  const afterMark = model.getPremiumExpiringSoon().map((r) => r.userId);
  assert.ok(!afterMark.includes(soon));
});
