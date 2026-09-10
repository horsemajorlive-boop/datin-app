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
    photos: [],
    isVisible: true,
  };
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

  if (!row) return { ...emptyProfile(userId), photos, online, lastSeen };

  return {
    id: userId,
    userId,
    name: row.name,
    age: row.age,
    city: row.city,
    bio: row.bio,
    gender: row.gender,
    interests: JSON.parse(row.interests || '[]'),
    isVisible: !!row.is_visible,
    photos,
    online,
    lastSeen,
  };
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
    `INSERT INTO profiles (user_id, name, age, city, bio, gender, interests, updated_at)
     VALUES (:user_id, :name, :age, :city, :bio, :gender, :interests, :ts)
     ON CONFLICT(user_id) DO UPDATE SET
       name = :name, age = :age, city = :city, bio = :bio,
       gender = :gender, interests = :interests, updated_at = :ts`
  ).run({
    user_id: userId,
    name: String(data.name ?? '').slice(0, 40),
    age: data.age ? Number(data.age) : null,
    city: String(data.city ?? '').slice(0, 60),
    bio: String(data.bio ?? '').slice(0, 500),
    gender: ['f', 'm'].includes(data.gender) ? data.gender : '',
    interests: JSON.stringify(
      Array.isArray(data.interests) ? data.interests.slice(0, 12) : []
    ),
    ts: now(),
  });
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
    photos: photosStmt.all(r.user_id).map((p) => p.url),
  }));
}

// Кого показывать в поиске: видимые, не я, с заполненным именем, ещё не свайпнутые.
export function getFeed(userId, limit = 20) {
  const rows = db
    .prepare(
      `SELECT p.user_id, p.name, p.age, p.city, p.bio, p.gender, p.interests
         FROM profiles p
        WHERE p.is_visible = 1
          AND p.user_id <> :me
          AND p.name <> ''
          AND p.user_id NOT IN (
            SELECT target_id FROM swipes WHERE actor_id = :me
          )
        ORDER BY p.updated_at DESC
        LIMIT :limit`
    )
    .all({ me: userId, limit });
  return hydrateProfiles(rows);
}

// Кого я лайкнул (вкладка "Симпатии").
export function getMyLikes(userId) {
  const rows = db
    .prepare(
      `SELECT p.user_id, p.name, p.age, p.city, p.bio, p.gender, p.interests
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
  return { messageId, reaction: next };
}
