// Подключение к базе данных.
//
// node:sqlite — встроенный в Node модуль SQLite (появился в Node 22+).
// Ничего не нужно устанавливать и компилировать. Запросы синхронные:
// db.prepare(sql).get(...) / .all(...) / .run(...) — как в better-sqlite3.

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Файл БД. По умолчанию backend/data.db (в .gitignore).
const DB_PATH = process.env.DB_PATH || path.join(here, '..', 'data.db');

export const db = new DatabaseSync(DB_PATH);

// Включаем контроль внешних ключей (по умолчанию в SQLite он выключен).
db.exec('PRAGMA foreign_keys = ON;');

// Применяем схему: создаём таблицы, если их ещё нет.
const schema = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
db.exec(schema);

// Мини-миграции: добавляем новые колонки в уже существующую таблицу.
// ALTER TABLE ... ADD COLUMN бросит ошибку, если колонка уже есть — глотаем её.
const NEW_TEXT_COLUMNS = [
  'housing', 'car', 'employment', 'smoking', 'drinking',
  'goal', 'kids',
];
for (const col of NEW_TEXT_COLUMNS) {
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
    console.log(`[db] миграция: добавлена колонка profiles.${col}`);
  } catch {
    /* колонка уже существует — ок */
  }
}

const NEW_INT_COLUMNS = ['height', 'weight'];
for (const col of NEW_INT_COLUMNS) {
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN ${col} INTEGER`);
    console.log(`[db] миграция: добавлена колонка profiles.${col}`);
  } catch {
    /* колонка уже существует — ок */
  }
}

// Колонка users.terms_accepted_at + разовый бэкфилл: у кого уже есть
// заполненная анкета — считаем, что правила они приняли при регистрации,
// чтобы обновление не выкидывало их обратно на онбординг.
try {
  db.exec('ALTER TABLE users ADD COLUMN terms_accepted_at INTEGER');
  console.log('[db] миграция: добавлена колонка users.terms_accepted_at');
  db.exec(`
    UPDATE users SET terms_accepted_at = created_at
     WHERE terms_accepted_at IS NULL
       AND id IN (SELECT user_id FROM profiles WHERE name <> '')
  `);
} catch {
  /* колонка уже существует — ок */
}

try {
  db.exec('ALTER TABLE users ADD COLUMN verified_at INTEGER');
  console.log('[db] миграция: добавлена колонка users.verified_at');
} catch {
  /* колонка уже существует — ок */
}

try {
  db.exec('ALTER TABLE users ADD COLUMN show_online INTEGER NOT NULL DEFAULT 1');
  console.log('[db] миграция: добавлена колонка users.show_online');
} catch {
  /* колонка уже существует — ок */
}

try {
  db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
  console.log('[db] миграция: добавлена колонка users.is_admin');
} catch {
  /* колонка уже существует — ок */
}

for (const col of ['notify_matches', 'notify_messages', 'notify_likes']) {
  try {
    db.exec(`ALTER TABLE users ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 1`);
    console.log(`[db] миграция: добавлена колонка users.${col}`);
  } catch {
    /* колонка уже существует — ок */
  }
}

// Геопозиция для поиска "рядом" — необязательная, пользователь делится ей сам.
for (const col of ['lat', 'lng']) {
  try {
    db.exec(`ALTER TABLE profiles ADD COLUMN ${col} REAL`);
    console.log(`[db] миграция: добавлена колонка profiles.${col}`);
  } catch {
    /* колонка уже существует — ок */
  }
}

// Подсказки анкеты (вопрос-ответ) вместо голого "о себе".
try {
  db.exec(`ALTER TABLE profiles ADD COLUMN prompts TEXT NOT NULL DEFAULT '[]'`);
  console.log('[db] миграция: добавлена колонка profiles.prompts');
} catch {
  /* колонка уже существует — ок */
}

// Суперлайк — тот же лайк, но выделенный: 1 в день, отмечаем отдельным флагом.
try {
  db.exec(`ALTER TABLE swipes ADD COLUMN is_super INTEGER NOT NULL DEFAULT 0`);
  console.log('[db] миграция: добавлена колонка swipes.is_super');
} catch {
  /* колонка уже существует — ок */
}

console.log('[db] готова:', DB_PATH);
