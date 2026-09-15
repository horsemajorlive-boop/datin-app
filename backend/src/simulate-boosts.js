// Симуляция 1000 поднятий анкеты (буст) — проверяем всю систему на
// нагрузке, а не только "работает на одном примере":
//   - корректность: буст поднимает в топ, а по истечении 30 минут — нет;
//   - справедливость: если бустится много людей одновременно, никто
//     не "застревает" навсегда на первом месте (см. RANDOM() в getFeed);
//   - лимит: 1 буст в день на человека соблюдается даже при частых вызовах;
//   - производительность: запрос ленты остаётся быстрым при активных бустах.
//
// Работает на ИЗОЛИРОВАННОЙ базе — реальную dev-базу не трогает. Запуск:
//   DB_PATH=/tmp/boost-sim.db node src/simulate-boosts.js
// (если DB_PATH не задан — создаёт свою временную базу сам и удаляет её
// после прогона; передайте --keep-db, чтобы оставить файл для осмотра).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DAY_MS = 24 * 60 * 60 * 1000;

if (!process.env.DB_PATH) {
  process.env.DB_PATH = path.join(os.tmpdir(), `boost-sim-${Date.now()}.db`);
}
const keepDb = process.argv.includes('--keep-db');
console.log(`[sim] изолированная база: ${process.env.DB_PATH}`);

const model = await import('./models.js');
const { db } = await import('./db.js');

// ---------- параметры симуляции ----------
const N_CANDIDATES = 100; // сколько разных анкет участвует
const N_EVENTS = 1000; // сколько бустов симулируем всего
const MOSCOW = 'Москва';

// ---------- готовим "население" ----------
const viewerId = 700001;
model.upsertUser({ id: viewerId, first_name: 'Смотрящий', username: null });
model.saveProfile(viewerId, {
  name: 'Смотрящий', age: 28, city: MOSCOW, gender: 'm',
  bio: '', interests: ['Кино', 'Музыка', 'Путешествия', 'Книги', 'Кофе'],
  housing: 'rent', car: 'no', employment: 'working',
  goal: 'relationship', kids: 'maybe',
});

const candidateIds = [];
for (let i = 0; i < N_CANDIDATES; i++) {
  const id = 800001 + i;
  candidateIds.push(id);
  model.upsertUser({ id, first_name: `Кандидат${i}`, username: null });
  model.saveProfile(id, {
    name: `Кандидат${i}`, age: 20 + (i % 15), city: MOSCOW, gender: 'f',
    bio: '', interests: ['Кино', 'Музыка', 'Путешествия', 'Книги', 'Кофе'],
    housing: 'rent', car: 'no', employment: 'working',
    goal: 'relationship', kids: 'maybe',
  });
  // Premium на реальный год вперёд — буст доступен весь прогон симуляции
  // независимо от виртуального времени (виртуальные "дни" ниже влияют
  // только на дневной лимит бустов, не на срок самого Premium).
  model.grantPremium(id, 365);
}

// ---------- симуляция ----------
const virtualStart = Date.now();
let virtualNow = virtualStart;
const rankHits = []; // ранг (1-based) только что поднятого профиля сразу после буста
let top1Count = 0;
let top5Count = 0;
let notFoundCount = 0; // буст случился, но кандидата не видно в топ-20 (не ошибка — просто далеко)
let boostLimitHits = 0; // сколько раз упёрлись в дневной лимит (ожидаемо, не баг)
const queryDurationsMs = [];
let peakSimultaneous = 0;

// для проверки справедливости: пока одновременно поднято K профилей,
// смотрим, кто оказывается на месте #1 — распределение должно быть
// близко к равномерному (1/K на каждого), а не всегда один и тот же.
const top1Winners = new Map(); // candidateId -> сколько раз был #1 при 3+ одновременных
let fairnessSamples = 0;

// Лёгкий прямой запрос вместо getFullProfile (которая тянет за собой
// likeLimitFields и т.д.) — этот подсчёт идёт на каждой из 1000 итераций,
// тяжёлая версия заметно замедлила бы симуляцию.
const boostedUntilStmt = db.prepare(
  `SELECT id FROM users WHERE id IN (${candidateIds.map(() => '?').join(',')}) AND boosted_until > ?`
);
function countSimultaneous(now) {
  return boostedUntilStmt.all(...candidateIds, now).length;
}

for (let e = 0; e < N_EVENTS; e++) {
  // время между бустами — от получаса до ~40 минут виртуальных, вперемешку
  // с редкими "перерывами на ночь" (имитируем реальный суточный ритм)
  const gapMin = e % 37 === 0 ? 6 * 60 + Math.random() * 4 * 60 : Math.random() * 40;
  virtualNow += Math.round(gapMin * 60 * 1000);

  const candidateId = candidateIds[Math.floor(Math.random() * candidateIds.length)];
  const result = model.boostProfile(candidateId, { now: virtualNow });

  if (result.error) {
    // упёрлись в дневной лимит этого кандидата — это ОЖИДАЕМО (1/день),
    // просто едем дальше к следующему событию
    boostLimitHits++;
    continue;
  }

  const simultaneous = countSimultaneous(virtualNow);
  peakSimultaneous = Math.max(peakSimultaneous, simultaneous);

  const t0 = performance.now();
  const feed = model.getFeed(viewerId, { now: virtualNow, limit: 20 });
  const dt = performance.now() - t0;
  queryDurationsMs.push(dt);

  const rank = feed.findIndex((p) => p.id === candidateId);
  if (rank === -1) {
    notFoundCount++;
  } else {
    rankHits.push(rank + 1);
    if (rank === 0) top1Count++;
    if (rank < 5) top5Count++;
  }

  // справедливость: если сейчас одновременно бустятся 3+ человека,
  // смотрим, кто именно на #1 — на большой выборке ни один не должен
  // доминировать намного сильнее, чем 1/simultaneous
  if (simultaneous >= 3 && feed[0]?.isBoosted) {
    fairnessSamples++;
    const w = feed[0].id;
    top1Winners.set(w, (top1Winners.get(w) || 0) + 1);
  }
}
const virtualElapsedDays = (virtualNow - virtualStart) / DAY_MS;

// ---------- проверка истечения буста ----------
// Берём кандидата вне пула (свежий id, ни разу не бустился) и смотрим его
// isBoosted через BOOST_DURATION_MIN + 5 минут (буст уже точно истёк).
// Важно проверять именно isBoosted, а не "он ли первый в ленте" — после
// истечения он вполне МОЖЕТ оказаться первым по обычному порядку
// (p.updated_at), и это не имеет отношения к бусту.
const expiryTestId = 800999;
model.upsertUser({ id: expiryTestId, first_name: 'ПроверкаИстечения', username: null });
model.saveProfile(expiryTestId, {
  name: 'ПроверкаИстечения', age: 25, city: MOSCOW, gender: 'f',
  bio: '', interests: ['Кино', 'Музыка', 'Путешествия', 'Книги', 'Кофе'],
  housing: 'rent', car: 'no', employment: 'working',
  goal: 'relationship', kids: 'maybe',
});
model.grantPremium(expiryTestId, 365);
model.boostProfile(expiryTestId, { now: virtualNow });

const justAfterBoost = model
  .getFeed(viewerId, { now: virtualNow, limit: 200 })
  .find((p) => p.id === expiryTestId);

const afterExpiry = virtualNow + (model.BOOST_DURATION_MIN + 5) * 60 * 1000;
const afterExpiryProfile = model
  .getFeed(viewerId, { now: afterExpiry, limit: 200 })
  .find((p) => p.id === expiryTestId);

// ---------- дневной лимит: явная проверка ----------
// Один кандидат, два буста подряд в одну и ту же виртуальную "секунду" —
// второй должен быть отклонён с 'boost_limit'.
const limitTestId = candidateIds[0];
const first = model.boostProfile(limitTestId, { now: virtualNow + 1000 });
const second = model.boostProfile(limitTestId, { now: virtualNow + 2000 });

// ---------- отчёт ----------
function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
}
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * p)];
}

// "Справедливо" здесь не значит "все получают 1/simultaneous в моменте" —
// simultaneous гуляет от 3 до peakSimultaneous, так что честное теоретическое
// ожидание на каждую выборку своё. Вместо этого сравниваем, насколько
// САМЫЙ частый победитель отклоняется от СРЕДНЕГО числа побед на участника —
// близко к 1× = хорошо перемешано, в разы больше среднего = перекос/баг.
const avgWinsPerWinner = fairnessSamples / (top1Winners.size || 1);
const maxWins = top1Winners.size ? Math.max(...top1Winners.values()) : 0;
const skewRatio = avgWinsPerWinner ? maxWins / avgWinsPerWinner : 0;

console.log(`
============ Симуляция бустов: отчёт ============
События (попытки буста):        ${N_EVENTS}
  успешных:                     ${N_EVENTS - boostLimitHits}
  отклонено лимитом (1/день):   ${boostLimitHits}  (ожидаемо при ${N_EVENTS} событиях на ${N_CANDIDATES} кандидатов)
Участвовало кандидатов:         ${N_CANDIDATES}
Виртуальное время прогона:      ~${virtualElapsedDays.toFixed(1)} дн

--- Эффективность буста (сразу после поднятия) ---
Замеров ранга:                  ${rankHits.length}
Средний ранг сразу после буста: ${avg(rankHits).toFixed(2)}  (1 = самый верх ленты)
В топ-1 сразу после буста:      ${((top1Count / rankHits.length) * 100).toFixed(1)}%
В топ-5 сразу после буста:      ${((top5Count / rankHits.length) * 100).toFixed(1)}%
Не найден в топ-20 после буста: ${notFoundCount}

--- Справедливость при одновременных бустах (3+ сразу) ---
Пик одновременно поднятых:      ${peakSimultaneous}
Замеров с 3+ одновременными:    ${fairnessSamples}
Разных "победителей" места #1:  ${top1Winners.size}
Побед на победителя в среднем:  ${avgWinsPerWinner.toFixed(2)}
У самого частого победителя:    ${maxWins} побед (×${skewRatio.toFixed(2)} от среднего — близко к 1× = честно перемешано)

--- Истечение буста (проверка на конкретном кейсе) ---
Сразу после буста isBoosted:              ${justAfterBoost?.isBoosted ? 'да, корректно' : 'НЕТ — БАГ'}
Через ${model.BOOST_DURATION_MIN + 5} мин isBoosted:          ${afterExpiryProfile?.isBoosted ? 'ДА — БАГ, не истёк' : 'нет, корректно истёк'}

--- Дневной лимит (точечная проверка) ---
1-й буст подряд:                     ${first.error ? `отклонён (${first.error})` : 'принят'}
2-й буст той же анкеты в тот же день: ${second.error ? `отклонён (${second.error}) — корректно` : 'ПРИНЯТ — БАГ'}

--- Производительность getFeed при активных бустах ---
Запросов замерено:              ${queryDurationsMs.length}
Средняя длительность:           ${avg(queryDurationsMs).toFixed(2)} мс
p95:                             ${percentile(queryDurationsMs, 0.95).toFixed(2)} мс
Максимум:                       ${Math.max(...queryDurationsMs).toFixed(2)} мс
===================================================
`);

if (!keepDb) {
  db.close(); // на Windows файл занят, пока БД не закрыта явно — иначе rmSync молча не сработает
  try {
    fs.rmSync(process.env.DB_PATH, { force: true });
    console.log(`[sim] временная база удалена: ${process.env.DB_PATH}`);
  } catch {
    /* не критично */
  }
}
