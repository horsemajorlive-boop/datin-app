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
const NEW_TEXT_COLUMNS = ['housing', 'car', 'employment', 'smoking', 'drinking'];
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

console.log('[db] готова:', DB_PATH);
