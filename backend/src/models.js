// "Модели" — все запросы к базе в одном месте.
// Роуты (server.js) только принимают HTTP-запрос и зовут эти функции.

import { db } from './db.js';

const now = () => Date.now();

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
    height: null,
    weight: null,
    smoking: '',
    drinking: '',
    photos: [],
    isVisible: true,
    showOnline: true,
    termsAcceptedAt: null,
    onboarded: false,
    verified: false,
    verifiedAt: null,
    verificationStatus: 'none', // 'none' | 'pending' | 'approved' | 'rejected'
  };
}

// Сколько интересов минимум нужно указать при входе.
const ONBOARDING_MIN_INTERESTS = 5;

// Прошёл ли пользователь обязательный вход: принял правила + подтвердил 18,
// заполнил имя/возраст (18+)/пол, добавил фото, указал жильё/авто/работу
// и минимум 5 интересов. Рост и вес — необязательные, здесь не проверяются.
// Тот же список проверяется на сервере при POST /api/onboarding — обойти нельзя.
function computeOnboarded(profile) {
  return (
    profile.termsAcceptedAt != null &&
    !!profile.name &&
    Number.isFinite(profile.age) &&
    profile.age >= 18 &&
    (profile.gender === 'f' || profile.gender === 'm') &&
    profile.photos.length > 0 &&
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
      `SELECT terms_accepted_at, verified_at, show_online FROM users WHERE id = ?`
    )
    .get(userId);
  const termsAcceptedAt = userRow?.terms_accepted_at ?? null;
  const verifiedAt = userRow?.verified_at ?? null;
  const showOnline = (userRow?.show_online ?? 1) === 1;

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
  };

  if (!row) {
    const base = {
      ...emptyProfile(userId),
      photos,
      termsAcceptedAt,
      ...verifyFields,
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
    height: row.height ?? null,
    weight: row.weight ?? null,
    smoking: row.smoking || '',
    drinking: row.drinking || '',
    isVisible: !!row.is_visible,
    photos,
    termsAcceptedAt,
    ...verifyFields,
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
        housing, car, employment, height, weight, smoking, drinking, updated_at)
     VALUES
       (:user_id, :name, :age, :city, :bio, :gender, :interests,
        :housing, :car, :employment, :height, :weight, :smoking, :drinking, :ts)
     ON CONFLICT(user_id) DO UPDATE SET
       name = :name, age = :age, city = :city, bio = :bio,
       gender = :gender, interests = :interests,
       housing = :housing, car = :car, employment = :employment,
       height = :height, weight = :weight, smoking = :smoking, drinking = :drinking,
       updated_at = :ts`
  ).run({
    user_id: userId,
    name: String(data.name ?? '').slice(0, 40),
    age: intInRange(data.age, 18, 100), // младше 18 — не сохраняем
    city: String(data.city ?? '').slice(0, 60),
    bio: String(data.bio ?? '').slice(0, 500),
    gender: ['f', 'm'].includes(data.gender) ? data.gender : '',
    interests: JSON.stringify(
      Array.isArray(data.interests) ? data.interests.slice(0, 12) : []
    ),
    height: intInRange(data.height, 120, 230),
    weight: intInRange(data.weight, 35, 250),
    smoking: oneOf(data.smoking, SMOKING_CODES),
    drinking: oneOf(data.drinking, DRINKING_CODES),
    housing: oneOf(data.housing, HOUSING_CODES),
    car: oneOf(data.car, CAR_CODES),
    employment: oneOf(data.employment, EMPLOYMENT_CODES),
    ts: now(),
  });
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
function hydrateProfiles(rows) {
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
    height: r.height ?? null,
    weight: r.weight ?? null,
    smoking: r.smoking || '',
    drinking: r.drinking || '',
    verified: r.verified_at != null,
    photos: photosStmt.all(r.user_id).map((p) => p.url),
  }));
}

// Кого показывать в поиске.
// Базовые условия: видимые, не я, с именем, ещё не свайпнутые.
// opts — необязательные фильтры: ageMin, ageMax, city, gender, housing[], car, employment.
export function getFeed(userId, opts = {}) {
  const {
    ageMin,
    ageMax,
    city,
    gender,
    housing,
    car,
    employment,
    heightMin,
    heightMax,
    smoking,
    drinking,
    verified,
    sort,
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
  const params = { me: userId, limit: Math.min(Number(opts.limit) || 20, 50) };

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
  if (Array.isArray(housing)) {
    const codes = housing.filter((h) => HOUSING_CODES.includes(h));
    if (codes.length) {
      // набор кодов ограничен, поэтому безопасно раскрыть в IN (:h0, :h1, ...)
      const placeholders = codes.map((_, i) => `:h${i}`);
      where.push(`p.housing IN (${placeholders.join(', ')})`);
      codes.forEach((c, i) => (params[`h${i}`] = c));
    }
  }
  if (CAR_CODES.includes(car)) {
    where.push('p.car = :car');
    params.car = car;
  }
  if (EMPLOYMENT_CODES.includes(employment)) {
    where.push('p.employment = :employment');
    params.employment = employment;
  }
  if (verified) {
    where.push('u.verified_at IS NOT NULL');
  }

  // Сортировка: по умолчанию — недавно активные; 'new' — недавно
  // зарегистрированные (премиум-опция, но сам порядок безобиден).
  const orderBy =
    sort === 'new' ? 'u.created_at DESC, p.updated_at DESC' : 'p.updated_at DESC';

  const rows = db
    .prepare(
      `SELECT p.user_id, p.name, p.age, p.city, p.bio, p.gender, p.interests,
              p.housing, p.car, p.employment,
              p.height, p.weight, p.smoking, p.drinking, u.verified_at
         FROM profiles p
         JOIN users u ON u.id = p.user_id
        WHERE ${where.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT :limit`
    )
    .all(params);

  return hydrateProfiles(rows);
}

// Кого я лайкнул (вкладка "Симпатии").
export function getMyLikes(userId) {
  const rows = db
    .prepare(
      `SELECT p.user_id, p.name, p.age, p.city, p.bio, p.gender, p.interests,
              p.housing, p.car, p.employment,
              p.height, p.weight, p.smoking, p.drinking, u.verified_at
         FROM swipes s
         JOIN profiles p ON p.user_id = s.target_id
         JOIN users u ON u.id = p.user_id
        WHERE s.actor_id = :me AND s.direction = 'like'
          AND p.user_id NOT IN (
            SELECT blocked_id FROM blocks WHERE blocker_id = :me
            UNION
            SELECT blocker_id FROM blocks WHERE blocked_id = :me
          )
        ORDER BY s.created_at DESC`
    )
    .all({ me: userId });
  return hydrateProfiles(rows);
}

// ---------- Свайпы и мэтчи ----------

// Возвращает { match: boolean, matchId?: number, withUser?: profile }
export function recordSwipe(actorId, targetId, direction) {
  if (isBlockedEitherWay(actorId, targetId)) return { match: false };

  db.prepare(
    `INSERT INTO swipes (actor_id, target_id, direction, created_at)
     VALUES (:a, :t, :d, :ts)
     ON CONFLICT(actor_id, target_id) DO UPDATE SET direction = :d, created_at = :ts`
  ).run({ a: actorId, t: targetId, d: direction, ts: now() });

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

// Отмена последнего свайпа (кнопка "вернуть"). Удаляет свайп; если из-за него
// был мэтч — удаляет и мэтч со всеми сообщениями (каскадом).
export function undoSwipe(actorId, targetId) {
  db.prepare(`DELETE FROM swipes WHERE actor_id = ? AND target_id = ?`).run(
    actorId,
    targetId
  );
  const a = Math.min(actorId, targetId);
  const b = Math.max(actorId, targetId);
  db.prepare(`DELETE FROM matches WHERE user_a = ? AND user_b = ?`).run(a, b);
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
  const rows = db
    .prepare(
      `SELECT id, user_a, user_b, created_at
         FROM matches
        WHERE user_a = :me OR user_b = :me
        ORDER BY created_at DESC`
    )
    .all({ me: userId });

  const lastMsgStmt = db.prepare(
    `SELECT type, text, sender_id FROM messages
      WHERE match_id = ? ORDER BY created_at DESC LIMIT 1`
  );

  return rows.map((r) => {
    const otherId = r.user_a === userId ? r.user_b : r.user_a;
    const last = lastMsgStmt.get(r.id);
    return {
      matchId: r.id,
      createdAt: r.created_at,
      profile: getFullProfile(otherId, { forOther: true }),
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
  if (typeof patch.showOnline === 'boolean') {
    db.prepare(`UPDATE users SET show_online = :v WHERE id = :u`).run({
      v: patch.showOnline ? 1 : 0,
      u: userId,
    });
  }
  return getFullProfile(userId);
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
