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
    termsAcceptedAt: null,
    onboarded: false,
  };
}

// Прошёл ли пользователь обязательный вход: принял правила + подтвердил 18,
// заполнил имя, возраст (18+), пол и добавил хотя бы одно фото.
// Тот же список проверяется на сервере при POST /api/onboarding — обойти нельзя.
function computeOnboarded(profile) {
  return (
    profile.termsAcceptedAt != null &&
    !!profile.name &&
    Number.isFinite(profile.age) &&
    profile.age >= 18 &&
    (profile.gender === 'f' || profile.gender === 'm') &&
    profile.photos.length > 0
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

export function getFullProfile(userId) {
  const row = db
    .prepare(`SELECT * FROM profiles WHERE user_id = ?`)
    .get(userId);

  const photos = db
    .prepare(`SELECT url FROM photos WHERE user_id = ? ORDER BY position`)
    .all(userId)
    .map((p) => p.url);

  const { online, lastSeen } = presence(userId);

  const userRow = db
    .prepare(`SELECT terms_accepted_at FROM users WHERE id = ?`)
    .get(userId);
  const termsAcceptedAt = userRow?.terms_accepted_at ?? null;

  if (!row) {
    const base = { ...emptyProfile(userId), photos, termsAcceptedAt, online, lastSeen };
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

  if (data.acceptAge !== true || data.acceptRules !== true) {
    return { error: 'Нужно подтвердить возраст и принять правила' };
  }
  if (!name) return { error: 'Впишите имя' };
  if (age === null) return { error: 'Возраст — только от 18 до 100 лет' };
  if (!gender) return { error: 'Выберите пол' };
  if (photos.length === 0) return { error: 'Добавьте хотя бы одно фото' };

  // Пишем анкету, не затирая остальные поля, если они вдруг уже есть.
  const current = getFullProfile(userId);
  saveProfile(userId, { ...current, name, age, gender });
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
    sort,
  } = opts;

  // Собираем WHERE по кусочкам — только те условия, что реально заданы.
  const where = [
    'p.is_visible = 1',
    'p.user_id <> :me',
    "p.name <> ''",
    'p.user_id NOT IN (SELECT target_id FROM swipes WHERE actor_id = :me)',
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

  // Сортировка: по умолчанию — недавно активные; 'new' — недавно
  // зарегистрированные (премиум-опция, но сам порядок безобиден).
  const orderBy =
    sort === 'new' ? 'u.created_at DESC, p.updated_at DESC' : 'p.updated_at DESC';

  const rows = db
    .prepare(
      `SELECT p.user_id, p.name, p.age, p.city, p.bio, p.gender, p.interests,
              p.housing, p.car, p.employment,
              p.height, p.weight, p.smoking, p.drinking
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
              p.height, p.weight, p.smoking, p.drinking
         FROM swipes s
         JOIN profiles p ON p.user_id = s.target_id
        WHERE s.actor_id = :me AND s.direction = 'like'
        ORDER BY s.created_at DESC`
    )
    .all({ me: userId });
  return hydrateProfiles(rows);
}

// ---------- Свайпы и мэтчи ----------

// Возвращает { match: boolean, matchId?: number, withUser?: profile }
export function recordSwipe(actorId, targetId, direction) {
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

  return { match: true, matchId: m.id, withUser: getFullProfile(targetId) };
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
      profile: getFullProfile(otherId),
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
