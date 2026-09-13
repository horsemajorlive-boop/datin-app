// "Модели" — все запросы к базе в одном месте.
// Роуты (server.js) только принимают HTTP-запрос и зовут эти функции.

import { db } from './db.js';

const now = () => Date.now();

// Расстояние между двумя точками по прямой (формула гаверсинуса), в км.
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------- Пользователи ----------

// Создать пользователя или обновить имя/username и отметку "был онлайн".
export function upsertUser(tgUser) {
  db.prepare(
    `INSERT INTO users (id, username, first_name, created_at, last_seen_at)
     VALUES (:id, :username, :first_name, :ts, :ts)
     ON CONFLICT(id) DO UPDATE SET
       username = :username,
       first_name = :first_name,
       last_seen_at = :ts`
  ).run({
    id: tgUser.id,
    username: tgUser.username ?? null,
    first_name: tgUser.first_name ?? null,
    ts: now(),
  });
}

// ---------- Анкета ----------

// Допустимые коды полей "образа жизни" и "здоровья".
const HOUSING_CODES = ['own', 'rent', 'parents'];
const CAR_CODES = ['yes', 'no'];
const EMPLOYMENT_CODES = ['working', 'not_working'];
const SMOKING_CODES = ['no', 'sometimes', 'yes'];
const DRINKING_CODES = ['no', 'sometimes', 'yes'];
// Цель на сайте + отношение к детям.
const GOAL_CODES = ['friendship', 'date', 'flirt', 'relationship'];
const KIDS_CODES = ['want', 'have', 'dont', 'maybe'];

// Каталог подсказок анкеты (вопрос-ответ вместо голого "о себе") — коды
// должны совпадать с frontend/src/data/prompts.js.
const PROMPT_CODES = [
  'ideal_date', 'two_truths', 'talk_about', 'sunday', 'looking_for',
  'spontaneous', 'cant_live', 'talent', 'perfect_evening', 'fun_fact',
  'green_flag', 'win_heart',
];
const MAX_PROMPTS = 3;

// Чистим то, что пришло с клиента: только известные коды, непустой ответ
// (обрезаем до 150 символов), без повторов кода, не больше MAX_PROMPTS штук.
function sanitizePrompts(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const code = item?.code;
    const answer = String(item?.answer ?? '').trim().slice(0, 150);
    if (!PROMPT_CODES.includes(code) || !answer || seen.has(code)) continue;
    seen.add(code);
    out.push({ code, answer });
    if (out.length >= MAX_PROMPTS) break;
  }
  return out;
}
const oneOf = (value, codes) => (codes.includes(value) ? value : '');

// Число в диапазоне или null.
function intInRange(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
}

// Пустая анкета (когда пользователь ещё ничего не заполнил).
function emptyProfile(userId) {
  return {
    id: userId,
    userId,
    name: '',
    age: null,
    city: '',
    bio: '',
    gender: '',
    interests: [],
    housing: '',
    car: '',
    employment: '',
    goal: '',
    kids: '',
    height: null,
    weight: null,
    smoking: '',
    drinking: '',
    prompts: [],
    photos: [],
    hasLocation: false,
    isVisible: true,
    showOnline: true,
    notifyMatches: true,
    notifyMessages: true,
    notifyLikes: true,
    termsAcceptedAt: null,
    onboarded: false,
    verified: false,
    verifiedAt: null,
    verificationStatus: 'none', // 'none' | 'pending' | 'approved' | 'rejected'
  };
}

// Сколько интересов минимум нужно указать при входе.
const ONBOARDING_MIN_INTERESTS = 5;

// ---------- Premium ----------
// users.premium_until — до какого момента (мс) активен платный доступ,
// NULL/прошедшая дата = обычный пользователь. Продаётся за Telegram Stars
// (см. /api/premium/invoice и /telegram/webhook в server.js).
export const PREMIUM_DAYS = 30;
export const PREMIUM_PRICE_STARS = 199;

function getPremiumUntil(userId) {
  const u = db.prepare(`SELECT premium_until FROM users WHERE id = ?`).get(userId);
  return u?.premium_until ?? null;
}

export function isPremium(userId) {
  const until = getPremiumUntil(userId);
  return until != null && until > Date.now();
}

// Выдать/продлить Premium. Если он уже активен — считаем от текущей даты
// окончания (а не от "сейчас"), чтобы повторная покупка не пропадала впустую.
export function grantPremium(userId, days = PREMIUM_DAYS) {
  const base = Math.max(Date.now(), getPremiumUntil(userId) ?? 0);
  const until = base + days * 24 * 60 * 60 * 1000;
  db.prepare(`UPDATE users SET premium_until = ? WHERE id = ?`).run(until, userId);
  return until;
}

// ---------- Дневные лимиты лайков ----------
// Разумная дневная норма для всех — не давит, но даёт повод возвращаться
// каждый день; Premium снимает лимит лайков и даёт больше суперлайков.
// "Сегодня" — по местному времени сервера (полночь-полночь), без учёта
// часовых поясов пользователей — для нынешнего масштаба этого достаточно.
export const DAILY_LIKE_LIMIT = 30;
export const DAILY_SUPERLIKE_LIMIT = 1;
export const PREMIUM_DAILY_SUPERLIKE_LIMIT = 5;

function startOfTodayMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Сколько лайков (обычных или супер) actor уже поставил сегодня.
// Отменённый через "Вернуть" свайп удаляется из таблицы — значит и лимит
// за него возвращается, это ожидаемо.
function countTodaySwipes(actorId, isSuper) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM swipes
        WHERE actor_id = :a AND direction = 'like' AND is_super = :s
          AND created_at >= :since`
    )
    .get({ a: actorId, s: isSuper ? 1 : 0, since: startOfTodayMs() });
  return row.n;
}

// { isPremium, premiumUntil, likesLeft, superlikesLeft, dailyLikeLimit,
//   dailySuperlikeLimit } для анкеты. likesLeft/dailyLikeLimit — null у
// Premium (без лимита; null, а не Infinity, чтобы нормально уходило в JSON).
function likeLimitFields(userId) {
  const premiumUntil = getPremiumUntil(userId);
  const premium = premiumUntil != null && premiumUntil > Date.now();
  const superlikeLimit = premium ? PREMIUM_DAILY_SUPERLIKE_LIMIT : DAILY_SUPERLIKE_LIMIT;
  return {
    isPremium: premium,
    premiumUntil: premium ? premiumUntil : null,
    likesLeft: premium ? null : Math.max(0, DAILY_LIKE_LIMIT - countTodaySwipes(userId, false)),
    superlikesLeft: Math.max(0, superlikeLimit - countTodaySwipes(userId, true)),
    dailyLikeLimit: premium ? null : DAILY_LIKE_LIMIT,
    dailySuperlikeLimit: superlikeLimit,
  };
}

// Прошёл ли пользователь обязательный вход: принял правила + подтвердил 18,
// заполнил имя/возраст (18+)/пол, добавил фото, указал цель на сайте,
// жильё/авто/работу и минимум 5 интересов. Рост, вес и «дети» — необязательные.
// Тот же список проверяется при POST /api/onboarding.
function computeOnboarded(profile) {
  return (
    profile.termsAcceptedAt != null &&
    !!profile.name &&
    Number.isFinite(profile.age) &&
    profile.age >= 18 &&
    (profile.gender === 'f' || profile.gender === 'm') &&
    profile.photos.length > 0 &&
    GOAL_CODES.includes(profile.goal) &&
    HOUSING_CODES.includes(profile.housing) &&
    CAR_CODES.includes(profile.car) &&
    EMPLOYMENT_CODES.includes(profile.employment) &&
    profile.interests.length >= ONBOARDING_MIN_INTERESTS
  );
}

const ONLINE_WINDOW_MS = 90 * 1000; // "в сети", если активность была не позже 90 сек назад

// Присутствие пользователя из users.last_seen_at.
function presence(userId) {
  const u = db.prepare(`SELECT last_seen_at FROM users WHERE id = ?`).get(userId);
  const lastSeen = u?.last_seen_at ?? null;
  return {
    lastSeen,
    online: lastSeen != null && Date.now() - lastSeen < ONLINE_WINDOW_MS,
  };
}

// forOther=true — анкету смотрит другой пользователь: если владелец скрыл
// статус "в сети", не отдаём ему online/lastSeen.
export function getFullProfile(userId, { forOther = false } = {}) {
  const row = db
    .prepare(`SELECT * FROM profiles WHERE user_id = ?`)
    .get(userId);

  const photos = db
    .prepare(`SELECT url FROM photos WHERE user_id = ? ORDER BY position`)
    .all(userId)
    .map((p) => p.url);

  const userRow = db
    .prepare(
      `SELECT terms_accepted_at, verified_at, show_online,
              notify_matches, notify_messages, notify_likes
         FROM users WHERE id = ?`
    )
    .get(userId);
  const termsAcceptedAt = userRow?.terms_accepted_at ?? null;
  const verifiedAt = userRow?.verified_at ?? null;
  const showOnline = (userRow?.show_online ?? 1) === 1;
  const notify = {
    notifyMatches: (userRow?.notify_matches ?? 1) === 1,
    notifyMessages: (userRow?.notify_messages ?? 1) === 1,
    notifyLikes: (userRow?.notify_likes ?? 1) === 1,
  };

  let { online, lastSeen } = presence(userId);
  if (forOther && !showOnline) {
    online = false;
    lastSeen = null;
  }

  const vRow = db
    .prepare(`SELECT status FROM verifications WHERE user_id = ?`)
    .get(userId);
  const verificationStatus = verifiedAt != null
    ? 'approved'
    : vRow?.status || 'none';

  const verifyFields = {
    verified: verifiedAt != null,
    verifiedAt,
    verificationStatus,
    showOnline,
    ...notify,
  };

  if (!row) {
    const base = {
      ...emptyProfile(userId),
      photos,
      termsAcceptedAt,
      ...verifyFields,
      ...likeLimitFields(userId),
      online,
      lastSeen,
    };
    return { ...base, onboarded: computeOnboarded(base) };
  }

  const profile = {
    id: userId,
    userId,
    name: row.name,
    age: row.age,
    city: row.city,
    bio: row.bio,
    gender: row.gender,
    interests: JSON.parse(row.interests || '[]'),
    housing: row.housing || '',
    car: row.car || '',
    employment: row.employment || '',
    goal: row.goal || '',
    kids: row.kids || '',
    height: row.height ?? null,
    weight: row.weight ?? null,
    smoking: row.smoking || '',
    drinking: row.drinking || '',
    prompts: JSON.parse(row.prompts || '[]'),
    hasLocation: row.lat != null && row.lng != null,
    isVisible: !!row.is_visible,
    photos,
    termsAcceptedAt,
    ...verifyFields,
    ...likeLimitFields(userId),
    online,
    lastSeen,
  };
  return { ...profile, onboarded: computeOnboarded(profile) };
}

// Отметить пользователя "был онлайн сейчас".
export function touchUser(userId) {
  db.prepare(`UPDATE users SET last_seen_at = ? WHERE id = ?`).run(
    Date.now(),
    userId
  );
}

export function saveProfile(userId, data) {
  db.prepare(
    `INSERT INTO profiles
       (user_id, name, age, city, bio, gender, interests,
        housing, car, employment, goal, kids,
        height, weight, smoking, drinking, prompts, updated_at)
     VALUES
       (:user_id, :name, :age, :city, :bio, :gender, :interests,
        :housing, :car, :employment, :goal, :kids,
        :height, :weight, :smoking, :drinking, :prompts, :ts)
     ON CONFLICT(user_id) DO UPDATE SET
       name = :name, age = :age, city = :city, bio = :bio,
       gender = :gender, interests = :interests,
       housing = :housing, car = :car, employment = :employment,
       goal = :goal, kids = :kids,
       height = :height, weight = :weight, smoking = :smoking, drinking = :drinking,
       prompts = :prompts,
       updated_at = :ts`
  ).run({
    user_id: userId,
    name: String(data.name ?? '').slice(0, 40),
    age: intInRange(data.age, 18, 100), // младше 18 — не сохраняем
    city: String(data.city ?? '').slice(0, 60),
    bio: String(data.bio ?? '').slice(0, 500),
    gender: ['f', 'm'].includes(data.gender) ? data.gender : '',
    interests: JSON.stringify(
      Array.isArray(data.interests) ? data.interests.slice(0, 15) : []
    ),
    height: intInRange(data.height, 120, 230),
    weight: intInRange(data.weight, 35, 250),
    smoking: oneOf(data.smoking, SMOKING_CODES),
    drinking: oneOf(data.drinking, DRINKING_CODES),
    housing: oneOf(data.housing, HOUSING_CODES),
    car: oneOf(data.car, CAR_CODES),
    employment: oneOf(data.employment, EMPLOYMENT_CODES),
    goal: oneOf(data.goal, GOAL_CODES),
    kids: oneOf(data.kids, KIDS_CODES),
    prompts: JSON.stringify(sanitizePrompts(data.prompts)),
    ts: now(),
  });
}

// Геопозиция для поиска "рядом" — отдельно от остальной анкеты: делится ей
// пользователь по кнопке в фильтрах/настройках, а не через форму редактирования.
// lat=null, lng=null — убрать геопозицию (перестать участвовать в поиске "рядом").
export function setLocation(userId, lat, lng) {
  db.prepare(
    `UPDATE profiles SET lat = :lat, lng = :lng, updated_at = :ts WHERE user_id = :userId`
  ).run({ lat, lng, ts: now(), userId });
}

// Обязательный вход ("онбординг"). Проверяем всё на сервере, чтобы нельзя было
// проскочить мимо экранов на клиенте. Возвращает { error } либо { profile }.
export function acceptOnboarding(userId, data = {}) {
  const name = String(data.name ?? '').trim();
  const age = intInRange(data.age, 18, 100);
  const gender = ['f', 'm'].includes(data.gender) ? data.gender : '';
  const photos = (Array.isArray(data.photos) ? data.photos : [])
    .filter((u) => typeof u === 'string' && u.trim())
    .slice(0, 6);
  const housing = oneOf(data.housing, HOUSING_CODES);
  const car = oneOf(data.car, CAR_CODES);
  const employment = oneOf(data.employment, EMPLOYMENT_CODES);
  const goal = oneOf(data.goal, GOAL_CODES);
  const kids = oneOf(data.kids, KIDS_CODES); // необязательно
  // интересы: чистим строки, убираем дубли (без учёта регистра)
  const interests = [];
  for (const raw of Array.isArray(data.interests) ? data.interests : []) {
    const s = String(raw ?? '').trim().slice(0, 24);
    if (s && !interests.some((v) => v.toLowerCase() === s.toLowerCase())) {
      interests.push(s);
    }
  }
  // рост и вес — необязательные (null, если не указаны)
  const height = intInRange(data.height, 120, 230);
  const weight = intInRange(data.weight, 35, 250);

  if (data.acceptAge !== true || data.acceptRules !== true) {
    return { error: 'Нужно подтвердить возраст и принять правила' };
  }
  if (!name) return { error: 'Впишите имя' };
  if (age === null) return { error: 'Возраст — только от 18 до 100 лет' };
  if (!gender) return { error: 'Выберите пол' };
  if (photos.length === 0) return { error: 'Добавьте хотя бы одно фото' };
  if (!goal) {
    return { error: 'Укажите, что вы хотите от сайта' };
  }
  if (!housing || !car || !employment) {
    return { error: 'Заполните жильё, авто и работу' };
  }
  if (interests.length < ONBOARDING_MIN_INTERESTS) {
    return { error: `Выберите минимум ${ONBOARDING_MIN_INTERESTS} интересов` };
  }

  // Пишем анкету, не затирая остальные поля, если они вдруг уже есть.
  const current = getFullProfile(userId);
  saveProfile(userId, {
    ...current,
    name,
    age,
    gender,
    housing,
    car,
    employment,
    goal,
    kids,
    height,
    weight,
    interests,
  });
  setPhotos(userId, photos);
  db.prepare(`UPDATE users SET terms_accepted_at = ? WHERE id = ?`).run(
    now(),
    userId
  );

  return { profile: getFullProfile(userId) };
}

// Заменить все фото пользователя новым списком url-ов.
// node:sqlite не даёт db.transaction(), поэтому границы транзакции — вручную.
export function setPhotos(userId, urls) {
  const list = (Array.isArray(urls) ? urls : []).slice(0, 6);
  const clear = db.prepare(`DELETE FROM photos WHERE user_id = ?`);
  const insert = db.prepare(
    `INSERT INTO photos (user_id, url, position) VALUES (?, ?, ?)`
  );

  db.exec('BEGIN');
  try {
    clear.run(userId);
    list.forEach((url, i) => insert.run(userId, String(url), i));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// ---------- Лента и симпатии ----------

// Превращает строки анкет в объекты для фронтенда (+ подтягивает фото).
// viewerLoc — { lat, lng } смотрящего, если он поделился геопозицией; тогда
// каждой анкете с известными координатами добавляем distanceKm (округлённо).
// Сами координаты наружу не отдаём — только расстояние.
function hydrateProfiles(rows, viewerLoc = null) {
  const photosStmt = db.prepare(
    `SELECT url FROM photos WHERE user_id = ? ORDER BY position`
  );
  return rows.map((r) => ({
    id: r.user_id,
    name: r.name,
    age: r.age,
    city: r.city,
    bio: r.bio,
    gender: r.gender,
    interests: JSON.parse(r.interests || '[]'),
    housing: r.housing || '',
    car: r.car || '',
    employment: r.employment || '',
    goal: r.goal || '',
    kids: r.kids || '',
    height: r.height ?? null,
    weight: r.weight ?? null,
    smoking: r.smoking || '',
    drinking: r.drinking || '',
    prompts: JSON.parse(r.prompts || '[]'),
    verified: r.verified_at != null,
    isSuper: !!r.is_super,
    distanceKm:
      viewerLoc && r.lat != null && r.lng != null
        ? Math.round(haversineKm(viewerLoc.lat, viewerLoc.lng, r.lat, r.lng))
        : null,
    photos: photosStmt.all(r.user_id).map((p) => p.url),
  }));
}

// Кого показывать в поиске.
// Базовые условия: видимые, не я, с именем, ещё не свайпнутые.
// opts — необязательные фильтры: ageMin, ageMax, city, gender, housing[], car, employment,
// radiusKm (нужна своя геопозиция — см. setLocation).
export function getFeed(userId, opts = {}) {
  const {
    ageMin,
    ageMax,
    city,
    gender,
    housing,
    car,
    employment,
    goal,
    kids,
    heightMin,
    heightMax,
    smoking,
    drinking,
    verified,
    sort,
    radiusKm,
  } = opts;

  // Собираем WHERE по кусочкам — только те условия, что реально заданы.
  const where = [
    'p.is_visible = 1',
    'p.user_id <> :me',
    "p.name <> ''",
    'p.user_id NOT IN (SELECT target_id FROM swipes WHERE actor_id = :me)',
    // никого, с кем есть блокировка в любую сторону
    `p.user_id NOT IN (
       SELECT blocked_id FROM blocks WHERE blocker_id = :me
       UNION
       SELECT blocker_id FROM blocks WHERE blocked_id = :me
     )`,
  ];
  const rawLimit = Math.min(Number(opts.limit) || 20, 50);
  const params = { me: userId, limit: rawLimit };

  // "Рядом со мной" работает только если сам поделился геопозицией.
  const viewerLoc = db
    .prepare(`SELECT lat, lng FROM profiles WHERE user_id = ?`)
    .get(userId);
  const hasViewerLoc = !!(viewerLoc && viewerLoc.lat != null && viewerLoc.lng != null);
  const wantsNear = hasViewerLoc && (Number.isFinite(radiusKm) || sort === 'near');
  if (wantsNear) {
    // считаем точное расстояние в JS (см. ниже), а тут — только кандидаты
    // с известными координатами. При заметном росте базы сюда стоит добавить
    // предварительный отбор по bounding box в SQL — пока хватает и так.
    where.push('p.lat IS NOT NULL AND p.lng IS NOT NULL');
    // берём кандидатов с запасом: часть отсеется по точному радиусу
    params.limit = Math.min(rawLimit * 5, 300);
  }

  // Возраст: минимум всегда не ниже 18.
  if (Number.isFinite(ageMin)) {
    where.push('p.age >= :ageMin');
    params.ageMin = Math.max(18, Math.min(100, ageMin));
  }
  if (Number.isFinite(ageMax)) {
    where.push('p.age <= :ageMax');
    params.ageMax = Math.max(18, Math.min(100, ageMax));
  }
  if (Number.isFinite(heightMin)) {
    where.push('p.height >= :heightMin');
    params.heightMin = heightMin;
  }
  if (Number.isFinite(heightMax)) {
    where.push('p.height <= :heightMax');
    params.heightMax = heightMax;
  }
  if (SMOKING_CODES.includes(smoking)) {
    where.push('p.smoking = :smoking');
    params.smoking = smoking;
  }
  if (DRINKING_CODES.includes(drinking)) {
    where.push('p.drinking = :drinking');
    params.drinking = drinking;
  }
  if (city) {
    // город выбирается из списка, поэтому сравниваем точно
    where.push('p.city = :city');
    params.city = city;
  }
  if (gender === 'f' || gender === 'm') {
    where.push('p.gender = :gender');
    params.gender = gender;
  }
  // Фильтр по быту (жильё/авто/работа) — только с Premium; если его нет,
  // просто игнорируем эти параметры, а не отказываем в запросе целиком.
  const premium = isPremium(userId);
  if (premium && Array.isArray(housing)) {
    const codes = housing.filter((h) => HOUSING_CODES.includes(h));
    if (codes.length) {
      // набор кодов ограничен, поэтому безопасно раскрыть в IN (:h0, :h1, ...)
      const placeholders = codes.map((_, i) => `:h${i}`);
      where.push(`p.housing IN (${placeholders.join(', ')})`);
      codes.forEach((c, i) => (params[`h${i}`] = c));
    }
  }
  if (premium && CAR_CODES.includes(car)) {
    where.push('p.car = :car');
    params.car = car;
  }
  if (premium && EMPLOYMENT_CODES.includes(employment)) {
    where.push('p.employment = :employment');
    params.employment = employment;
  }
  if (GOAL_CODES.includes(goal)) {
    where.push('p.goal = :goal');
    params.goal = goal;
  }
  if (KIDS_CODES.includes(kids)) {
    where.push('p.kids = :kids');
    params.kids = kids;
  }
  if (verified) {
    where.push('u.verified_at IS NOT NULL');
  }

  // Сортировка: по умолчанию — недавно активные; 'new' — недавно
  // зарегистрированные, только для Premium (иначе тихо остаёмся на обычной).
  const orderBy =
    sort === 'new' && premium
      ? 'u.created_at DESC, p.updated_at DESC'
      : 'p.updated_at DESC';

  const rows = db
    .prepare(
      `SELECT p.user_id, p.name, p.age, p.city, p.bio, p.gender, p.interests,
              p.housing, p.car, p.employment, p.goal, p.kids,
              p.height, p.weight, p.smoking, p.drinking, p.prompts, p.lat, p.lng, u.verified_at
         FROM profiles p
         JOIN users u ON u.id = p.user_id
        WHERE ${where.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT :limit`
    )
    .all(params);

  let profiles = hydrateProfiles(rows, hasViewerLoc ? viewerLoc : null);

  if (wantsNear) {
    profiles = profiles.filter((p) => p.distanceKm != null);
    if (Number.isFinite(radiusKm)) {
      profiles = profiles.filter((p) => p.distanceKm <= radiusKm);
    }
    profiles.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return profiles.slice(0, rawLimit);
}

// Кто лайкнул ВАС и ждёт ответа (вкладка "Симпатии").
// Только те, кому вы ещё не ответили своим свайпом, и без заблокированных.
// Ответный лайк сразу превращается в мэтч.
export function getIncomingLikes(userId) {
  const rows = db
    .prepare(
      `SELECT p.user_id, p.name, p.age, p.city, p.bio, p.gender, p.interests,
              p.housing, p.car, p.employment, p.goal, p.kids,
              p.height, p.weight, p.smoking, p.drinking, p.prompts, p.lat, p.lng,
              s.is_super, u.verified_at
         FROM swipes s
         JOIN profiles p ON p.user_id = s.actor_id
         JOIN users u ON u.id = p.user_id
        WHERE s.target_id = :me AND s.direction = 'like'
          AND p.is_visible = 1 AND p.name <> ''
          AND s.actor_id NOT IN (
            SELECT target_id FROM swipes WHERE actor_id = :me
          )
          AND s.actor_id NOT IN (
            SELECT blocked_id FROM blocks WHERE blocker_id = :me
            UNION
            SELECT blocker_id FROM blocks WHERE blocked_id = :me
          )
        ORDER BY s.is_super DESC, s.created_at DESC`
    )
    .all({ me: userId });
  const viewerLoc = db
    .prepare(`SELECT lat, lng FROM profiles WHERE user_id = ?`)
    .get(userId);
  const hasViewerLoc = !!(viewerLoc && viewerLoc.lat != null && viewerLoc.lng != null);
  return hydrateProfiles(rows, hasViewerLoc ? viewerLoc : null);
}

// ---------- Свайпы и мэтчи ----------

// Возвращает { match: boolean, matchId?: number, withUser?: profile }
// либо { match: false, error: 'like_limit' | 'superlike_limit' }, если
// дневная норма лайков/суперлайков уже исчерпана — тогда свайп НЕ пишем.
export function recordSwipe(actorId, targetId, direction, { isSuper = false } = {}) {
  if (isBlockedEitherWay(actorId, targetId)) return { match: false };

  if (direction === 'like') {
    const premium = isPremium(actorId);
    if (isSuper) {
      const limit = premium ? PREMIUM_DAILY_SUPERLIKE_LIMIT : DAILY_SUPERLIKE_LIMIT;
      if (countTodaySwipes(actorId, true) >= limit) {
        return { match: false, error: 'superlike_limit' };
      }
    } else if (!premium && countTodaySwipes(actorId, false) >= DAILY_LIKE_LIMIT) {
      return { match: false, error: 'like_limit' };
    }
  }

  db.prepare(
    `INSERT INTO swipes (actor_id, target_id, direction, is_super, created_at)
     VALUES (:a, :t, :d, :s, :ts)
     ON CONFLICT(actor_id, target_id) DO UPDATE SET direction = :d, is_super = :s, created_at = :ts`
  ).run({ a: actorId, t: targetId, d: direction, s: isSuper ? 1 : 0, ts: now() });

  if (direction !== 'like') return { match: false };

  // Лайкнул ли target нас раньше?
  const back = db
    .prepare(
      `SELECT 1 FROM swipes
        WHERE actor_id = :t AND target_id = :a AND direction = 'like'`
    )
    .get({ a: actorId, t: targetId });

  if (!back) return { match: false };

  // Взаимно — создаём мэтч (пара в порядке a < b).
  const a = Math.min(actorId, targetId);
  const b = Math.max(actorId, targetId);
  db.prepare(
    `INSERT INTO matches (user_a, user_b, created_at) VALUES (?, ?, ?)
     ON CONFLICT(user_a, user_b) DO NOTHING`
  ).run(a, b, now());

  const m = db
    .prepare(`SELECT id FROM matches WHERE user_a = ? AND user_b = ?`)
    .get(a, b);

  return {
    match: true,
    matchId: m.id,
    withUser: getFullProfile(targetId, { forOther: true }),
  };
}

// Отмена последнего свайпа (кнопка "вернуть") — доступна только с Premium
// (на клиенте это тоже проверяется, но решает всегда сервер). Удаляет свайп;
// если из-за него был мэтч — удаляет и мэтч со всеми сообщениями (каскадом).
export function undoSwipe(actorId, targetId) {
  if (!isPremium(actorId)) return { error: 'premium_required' };

  db.prepare(`DELETE FROM swipes WHERE actor_id = ? AND target_id = ?`).run(
    actorId,
    targetId
  );
  const a = Math.min(actorId, targetId);
  const b = Math.max(actorId, targetId);
  db.prepare(`DELETE FROM matches WHERE user_a = ? AND user_b = ?`).run(a, b);
  return { ok: true };
}

// ---------- Мэтчи и переписка ----------

// Состоит ли пользователь в этом мэтче. Возвращает id собеседника или null.
export function partnerOf(matchId, userId) {
  const m = db
    .prepare(`SELECT user_a, user_b FROM matches WHERE id = ?`)
    .get(matchId);
  if (!m) return null;
  if (m.user_a === userId) return m.user_b;
  if (m.user_b === userId) return m.user_a;
  return null;
}

// Оба участника мэтча: [user_a, user_b] или null.
export function matchUsers(matchId) {
  const m = db
    .prepare(`SELECT user_a, user_b FROM matches WHERE id = ?`)
    .get(matchId);
  return m ? [m.user_a, m.user_b] : null;
}

// Все, с кем у пользователя есть мэтч (для рассылки presence).
export function matchPartners(userId) {
  return db
    .prepare(
      `SELECT CASE WHEN user_a = :me THEN user_b ELSE user_a END AS other
         FROM matches WHERE user_a = :me OR user_b = :me`
    )
    .all({ me: userId })
    .map((r) => r.other);
}

export function getMatches(userId) {
  // Порядок — по времени последней активности (последнее сообщение, а если
  // сообщений нет — момент создания мэтча), свежие сверху.
  const rows = db
    .prepare(
      `SELECT id, user_a, user_b, created_at,
              COALESCE(
                (SELECT MAX(created_at) FROM messages WHERE match_id = matches.id),
                created_at
              ) AS activity_at
         FROM matches
        WHERE user_a = :me OR user_b = :me
        ORDER BY activity_at DESC`
    )
    .all({ me: userId });

  const lastMsgStmt = db.prepare(
    `SELECT type, text, sender_id FROM messages
      WHERE match_id = ? ORDER BY created_at DESC LIMIT 1`
  );
  // Сколько сообщений от собеседника пришло после того, как я в последний раз
  // открывал этот чат (нет строки в match_reads — считаем, что не открывал).
  const unreadStmt = db.prepare(
    `SELECT COUNT(*) AS n FROM messages
      WHERE match_id = :m AND sender_id <> :me
        AND created_at > COALESCE(
          (SELECT last_read_at FROM match_reads WHERE match_id = :m AND user_id = :me),
          0
        )`
  );

  return rows.map((r) => {
    const otherId = r.user_a === userId ? r.user_b : r.user_a;
    const last = lastMsgStmt.get(r.id);
    return {
      matchId: r.id,
      createdAt: r.created_at,
      profile: getFullProfile(otherId, { forOther: true }),
      unread: unreadStmt.get({ m: r.id, me: userId }).n,
      lastMessage: last
        ? {
            type: last.type,
            text: last.text,
            fromMe: last.sender_id === userId,
          }
        : null,
    };
  });
}

// Отметить переписку прочитанной до текущего момента.
export function markMatchRead(matchId, userId) {
  if (partnerOf(matchId, userId) === null) return null;
  db.prepare(
    `INSERT INTO match_reads (match_id, user_id, last_read_at)
     VALUES (:m, :u, :ts)
     ON CONFLICT(match_id, user_id) DO UPDATE SET last_read_at = :ts`
  ).run({ m: matchId, u: userId, ts: now() });
  return { ok: true };
}

export function getMessages(matchId, userId) {
  if (partnerOf(matchId, userId) === null) return null; // не участник — нет доступа
  const rows = db
    .prepare(
      `SELECT id, sender_id, type, text, photo_url, reaction, created_at
         FROM messages WHERE match_id = ? ORDER BY created_at`
    )
    .all(matchId);

  return rows.map((r) => ({
    id: r.id,
    from: r.sender_id === userId ? 'me' : 'them',
    type: r.type,
    text: r.text,
    photo: r.photo_url,
    reaction: r.reaction,
    ts: r.created_at,
  }));
}

export function addMessage(matchId, senderId, { type = 'text', text, photo }) {
  if (partnerOf(matchId, senderId) === null) return null;
  touchUser(senderId); // отправил сообщение — значит был онлайн
  const info = db
    .prepare(
      `INSERT INTO messages (match_id, sender_id, type, text, photo_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      matchId,
      senderId,
      type,
      type === 'photo' ? null : String(text ?? '').slice(0, 1000),
      type === 'photo' ? String(photo ?? '') : null,
      now()
    );

  const r = db
    .prepare(`SELECT * FROM messages WHERE id = ?`)
    .get(info.lastInsertRowid);

  return {
    id: r.id,
    from: 'me',
    type: r.type,
    text: r.text,
    photo: r.photo_url,
    reaction: r.reaction,
    ts: r.created_at,
  };
}

// Поставить/снять реакцию. Разрешаем реагировать на любое сообщение своего мэтча.
export function setReaction(messageId, userId, emoji) {
  const msg = db
    .prepare(`SELECT match_id, reaction FROM messages WHERE id = ?`)
    .get(messageId);
  if (!msg || partnerOf(msg.match_id, userId) === null) return null;

  const next = msg.reaction === emoji ? null : emoji; // тот же эмодзи — снять
  db.prepare(`UPDATE messages SET reaction = ? WHERE id = ?`).run(
    next,
    messageId
  );
  return { messageId, reaction: next, matchId: msg.match_id };
}

// ---------- Верификация фото (ручная модерация) ----------

// Пользователь прислал селфи на проверку. Новая заявка заменяет прошлую.
// Саму галочку не трогаем — её снимает/ставит только админ.
export function submitVerification(userId, photoFile, pose) {
  db.prepare(
    `INSERT INTO verifications (user_id, photo_file, pose, status, created_at)
     VALUES (:u, :f, :p, 'pending', :ts)
     ON CONFLICT(user_id) DO UPDATE SET
       photo_file = :f, pose = :p, status = 'pending',
       created_at = :ts, reviewed_at = NULL, reviewed_by = NULL`
  ).run({ u: userId, f: photoFile, p: String(pose || '').slice(0, 120), ts: now() });
  return { status: 'pending' };
}

// Имя файла селфи для конкретной заявки (нужно админу, чтобы показать фото).
export function getVerificationFile(userId) {
  const row = db
    .prepare(`SELECT photo_file FROM verifications WHERE user_id = ?`)
    .get(userId);
  return row?.photo_file || null;
}

// Очередь на модерацию: все заявки в статусе pending + анкета и публичные фото,
// чтобы админу было с чем сравнивать селфи.
export function getPendingVerifications() {
  const rows = db
    .prepare(
      `SELECT v.user_id, v.pose, v.created_at, p.name, p.age, p.city
         FROM verifications v
         JOIN profiles p ON p.user_id = v.user_id
        WHERE v.status = 'pending'
        ORDER BY v.created_at ASC`
    )
    .all();

  const photosStmt = db.prepare(
    `SELECT url FROM photos WHERE user_id = ? ORDER BY position`
  );

  return rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    age: r.age,
    city: r.city,
    pose: r.pose,
    createdAt: r.created_at,
    photos: photosStmt.all(r.user_id).map((p) => p.url),
  }));
}

// Решение админа: 'approve' ставит золотую галочку, 'reject' — снимает.
export function reviewVerification(userId, adminId, decision) {
  const row = db
    .prepare(`SELECT status FROM verifications WHERE user_id = ?`)
    .get(userId);
  if (!row) return { error: 'заявка не найдена' };

  const approve = decision === 'approve';
  db.prepare(
    `UPDATE verifications
        SET status = :s, reviewed_at = :ts, reviewed_by = :admin
      WHERE user_id = :u`
  ).run({
    s: approve ? 'approved' : 'rejected',
    ts: now(),
    admin: adminId,
    u: userId,
  });
  db.prepare(`UPDATE users SET verified_at = :v WHERE id = :u`).run({
    v: approve ? now() : null,
    u: userId,
  });
  return { status: approve ? 'approved' : 'rejected' };
}

// Пользователь поменял фото анкеты — снимаем галочку и заявку,
// чтобы верификацию нельзя было "унаследовать" на другие снимки.
export function revokeVerification(userId) {
  db.prepare(`UPDATE users SET verified_at = NULL WHERE id = ?`).run(userId);
  db.prepare(`DELETE FROM verifications WHERE user_id = ?`).run(userId);
}

// ---------- Настройки и аккаунт ----------

// Точечное обновление настроек. Пишем только то, что реально пришло.
export function updateSettings(userId, patch = {}) {
  if (typeof patch.isVisible === 'boolean') {
    db.prepare(`UPDATE profiles SET is_visible = :v WHERE user_id = :u`).run({
      v: patch.isVisible ? 1 : 0,
      u: userId,
    });
  }
  const userCols = {
    showOnline: 'show_online',
    notifyMatches: 'notify_matches',
    notifyMessages: 'notify_messages',
    notifyLikes: 'notify_likes',
  };
  for (const [key, col] of Object.entries(userCols)) {
    if (typeof patch[key] === 'boolean') {
      db.prepare(`UPDATE users SET ${col} = :v WHERE id = :u`).run({
        v: patch[key] ? 1 : 0,
        u: userId,
      });
    }
  }
  return getFullProfile(userId);
}

// Быстрая проверка настроек уведомлений (для модуля notifications).
export function getNotifyPrefs(userId) {
  const r = db
    .prepare(
      `SELECT notify_matches, notify_messages, notify_likes FROM users WHERE id = ?`
    )
    .get(userId);
  return {
    matches: (r?.notify_matches ?? 1) === 1,
    messages: (r?.notify_messages ?? 1) === 1,
    likes: (r?.notify_likes ?? 1) === 1,
  };
}

// Полное удаление аккаунта. Возвращает имена файлов, которые роут должен
// удалить с диска (фото анкеты + селфи верификации). Строки БД уходят
// каскадом по внешним ключам ON DELETE CASCADE.
export function deleteAccount(userId) {
  const photoFiles = db
    .prepare(`SELECT url FROM photos WHERE user_id = ?`)
    .all(userId)
    .map((r) => r.url);
  const vRow = db
    .prepare(`SELECT photo_file FROM verifications WHERE user_id = ?`)
    .get(userId);

  db.prepare(`DELETE FROM users WHERE id = ?`).run(userId);

  return {
    uploadFiles: photoFiles
      .filter((u) => typeof u === 'string' && u.startsWith('/uploads/'))
      .map((u) => u.slice('/uploads/'.length)),
    verificationFile: vRow?.photo_file || null,
  };
}

// ---------- Блокировки и жалобы ----------

const REPORT_REASONS = ['spam', 'scam', 'offensive', 'photos', 'underage', 'other'];

// Есть ли блокировка между a и b в любую сторону.
export function isBlockedEitherWay(a, b) {
  const row = db
    .prepare(
      `SELECT 1 FROM blocks
        WHERE (blocker_id = :a AND blocked_id = :b)
           OR (blocker_id = :b AND blocked_id = :a)
        LIMIT 1`
    )
    .get({ a, b });
  return !!row;
}

// Заблокировать пользователя: запись в blocks + разрыв связи
// (свайпы обеих сторон и мэтч со всей перепиской).
export function blockUser(blockerId, blockedId) {
  if (blockerId === blockedId) return { error: 'нельзя заблокировать себя' };

  db.prepare(
    `INSERT INTO blocks (blocker_id, blocked_id, created_at)
     VALUES (:b, :t, :ts)
     ON CONFLICT(blocker_id, blocked_id) DO NOTHING`
  ).run({ b: blockerId, t: blockedId, ts: now() });

  db.prepare(
    `DELETE FROM swipes
      WHERE (actor_id = :a AND target_id = :b)
         OR (actor_id = :b AND target_id = :a)`
  ).run({ a: blockerId, b: blockedId });

  const lo = Math.min(blockerId, blockedId);
  const hi = Math.max(blockerId, blockedId);
  db.prepare(`DELETE FROM matches WHERE user_a = ? AND user_b = ?`).run(lo, hi);

  return { ok: true };
}

export function unblockUser(blockerId, blockedId) {
  db.prepare(
    `DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`
  ).run(blockerId, blockedId);
  return { ok: true };
}

// Кого я заблокировал — для экрана настроек.
export function getBlockedList(userId) {
  const rows = db
    .prepare(
      `SELECT b.blocked_id AS id, p.name
         FROM blocks b
         LEFT JOIN profiles p ON p.user_id = b.blocked_id
        WHERE b.blocker_id = :me
        ORDER BY b.created_at DESC`
    )
    .all({ me: userId });

  const photoStmt = db.prepare(
    `SELECT url FROM photos WHERE user_id = ? ORDER BY position LIMIT 1`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name || 'Пользователь',
    photo: photoStmt.get(r.id)?.url || null,
  }));
}

// Пожаловаться. Жалоба всегда сопровождается блокировкой.
export function createReport(reporterId, reportedId, reason, note) {
  if (reporterId === reportedId) return { error: 'нельзя пожаловаться на себя' };
  if (!REPORT_REASONS.includes(reason)) return { error: 'неизвестная причина' };

  db.prepare(
    `INSERT INTO reports (reporter_id, reported_id, reason, note, created_at)
     VALUES (:r, :t, :reason, :note, :ts)`
  ).run({
    r: reporterId,
    t: reportedId,
    reason,
    note: String(note ?? '').slice(0, 500),
    ts: now(),
  });

  blockUser(reporterId, reportedId);
  return { ok: true };
}

// Очередь жалоб для админа: открытые, с анкетой того, на кого пожаловались.
export function getOpenReports() {
  const rows = db
    .prepare(
      `SELECT r.id, r.reason, r.note, r.created_at,
              r.reporter_id, r.reported_id,
              rep.name AS reporter_name, tgt.name AS reported_name
         FROM reports r
         LEFT JOIN profiles rep ON rep.user_id = r.reporter_id
         LEFT JOIN profiles tgt ON tgt.user_id = r.reported_id
        WHERE r.status = 'open'
        ORDER BY r.created_at ASC`
    )
    .all();

  const photosStmt = db.prepare(
    `SELECT url FROM photos WHERE user_id = ? ORDER BY position`
  );
  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    note: r.note,
    createdAt: r.created_at,
    reporterId: r.reporter_id,
    reporterName: r.reporter_name || 'Пользователь',
    reportedId: r.reported_id,
    reportedName: r.reported_name || 'Пользователь',
    reportedPhotos: photosStmt.all(r.reported_id).map((p) => p.url),
  }));
}

export function reviewReport(reportId, adminId) {
  const info = db
    .prepare(
      `UPDATE reports SET status = 'reviewed', reviewed_at = :ts, reviewed_by = :admin
        WHERE id = :id AND status = 'open'`
    )
    .run({ ts: now(), admin: adminId, id: reportId });
  return info.changes > 0 ? { ok: true } : { error: 'жалоба не найдена' };
}

// Быстрое действие админа: скрыть анкету из поиска.
export function hideProfile(userId) {
  db.prepare(`UPDATE profiles SET is_visible = 0 WHERE user_id = ?`).run(userId);
  return { ok: true };
}
