-- Схема базы данных. Выполняется при каждом старте сервера
-- (IF NOT EXISTS — поэтому существующие таблицы не трогаются).

-- Пользователи. id совпадает с id пользователя в Telegram.
CREATE TABLE IF NOT EXISTS users (
  id                 INTEGER PRIMARY KEY,
  username           TEXT,
  first_name         TEXT,
  created_at         INTEGER NOT NULL,
  last_seen_at       INTEGER NOT NULL,
  terms_accepted_at  INTEGER,         -- когда принял правила и подтвердил 18+ (NULL = ещё нет)
  verified_at        INTEGER,         -- когда админ подтвердил фото (NULL = не подтверждён)
  show_online        INTEGER NOT NULL DEFAULT 1, -- 1 = показывать статус "в сети" другим
  is_admin           INTEGER NOT NULL DEFAULT 0, -- 1 = может модерировать верификации
  notify_matches     INTEGER NOT NULL DEFAULT 1, -- пуш о новом мэтче
  notify_messages    INTEGER NOT NULL DEFAULT 1, -- пуш о новом сообщении
  notify_likes       INTEGER NOT NULL DEFAULT 1  -- пуш о новой симпатии
);

-- Заявки на верификацию фото. Одна активная на пользователя: новая заявка
-- заменяет прошлую. Селфи лежит в приватной папке, наружу не отдаётся.
CREATE TABLE IF NOT EXISTS verifications (
  user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  photo_file  TEXT    NOT NULL,               -- имя файла в verification-uploads/
  pose        TEXT    NOT NULL DEFAULT '',    -- какая поза была задана
  status      TEXT    NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at  INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by INTEGER
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
  housing     TEXT    NOT NULL DEFAULT '',   -- 'own' | 'rent' | 'parents' | ''
  car         TEXT    NOT NULL DEFAULT '',   -- 'yes' | 'no' | ''
  employment  TEXT    NOT NULL DEFAULT '',   -- 'working' | 'not_working' | ''
  goal        TEXT    NOT NULL DEFAULT '',   -- 'friendship' | 'date' | 'flirt' | 'relationship'
  kids        TEXT    NOT NULL DEFAULT '',   -- 'want' | 'have' | 'dont' | 'maybe'
  height      INTEGER,                       -- рост в см (NULL = не указан)
  weight      INTEGER,                       -- вес в кг (NULL = не указан)
  smoking     TEXT    NOT NULL DEFAULT '',   -- 'no' | 'sometimes' | 'yes' | ''
  drinking    TEXT    NOT NULL DEFAULT '',   -- 'no' | 'sometimes' | 'yes' | ''
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

-- Докуда пользователь дочитал переписку. Нет строки — не читал вовсе.
CREATE TABLE IF NOT EXISTS match_reads (
  match_id     INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, user_id)
);

-- Блокировки: blocker заблокировал blocked. Действует в обе стороны
-- (они не видят друг друга нигде). Пара уникальна.
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Жалобы на пользователей — для модерации.
CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT    NOT NULL,                 -- код причины
  note        TEXT    NOT NULL DEFAULT '',      -- необязательный комментарий
  status      TEXT    NOT NULL DEFAULT 'open',  -- 'open' | 'reviewed'
  created_at  INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_swipes_actor  ON swipes(actor_id);
CREATE INDEX IF NOT EXISTS idx_swipes_target ON swipes(target_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at);
