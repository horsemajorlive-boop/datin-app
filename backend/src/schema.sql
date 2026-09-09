-- Схема базы данных. Выполняется при каждом старте сервера
-- (IF NOT EXISTS — поэтому существующие таблицы не трогаются).

-- Пользователи. id совпадает с id пользователя в Telegram.
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  username      TEXT,
  first_name    TEXT,
  created_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL
);

-- Анкета: одна на пользователя (user_id — первичный ключ).
CREATE TABLE IF NOT EXISTS profiles (
  user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL DEFAULT '',
  age         INTEGER,
  city        TEXT    NOT NULL DEFAULT '',
  bio         TEXT    NOT NULL DEFAULT '',
  gender      TEXT    NOT NULL DEFAULT '',   -- 'f' | 'm' | ''
  interests   TEXT    NOT NULL DEFAULT '[]', -- JSON-массив строк
  is_visible  INTEGER NOT NULL DEFAULT 1,    -- 1 = показывать в поиске
  updated_at  INTEGER NOT NULL
);

-- Фотографии анкеты. Несколько на пользователя, порядок — position.
CREATE TABLE IF NOT EXISTS photos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url       TEXT    NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0
);

-- Свайпы: actor свайпнул target. Пара (actor, target) уникальна.
CREATE TABLE IF NOT EXISTS swipes (
  actor_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction  TEXT    NOT NULL,              -- 'like' | 'pass'
  created_at INTEGER NOT NULL,
  PRIMARY KEY (actor_id, target_id)
);

-- Мэтчи (взаимные лайки). Пару храним упорядоченно: user_a < user_b,
-- тогда UNIQUE не даст создать её дважды.
CREATE TABLE IF NOT EXISTS matches (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE (user_a, user_b)
);

-- Сообщения в мэтче.
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id   INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL DEFAULT 'text', -- 'text' | 'emoji' | 'photo'
  text       TEXT,
  photo_url  TEXT,
  reaction   TEXT,                            -- эмодзи-реакция на сообщение
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_swipes_actor  ON swipes(actor_id);
CREATE INDEX IF NOT EXISTS idx_swipes_target ON swipes(target_id);
