// Периодический снимок базы — единственная копия данных живёт на одном
// Railway-volume, и при его отказе/случайном сносе вся база (анкеты, чаты,
// оплаты Premium) пропадёт безвозвратно. Простой набор файлов рядом решает
// это для масштаба проекта — не нужен ни внешний сервис, ни отдельная БД.
//
// VACUUM INTO делает консистентный снимок ЖИВОЙ базы (в отличие от простого
// копирования файла, которое может застать середину записи и дать битую
// копию) — это штатный механизм SQLite для бэкапов на лету.

import fs from 'node:fs';
import path from 'node:path';
import { db } from './db.js';
import { DATA_DIR } from './paths.js';

const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const INTERVAL_MS = 24 * 60 * 60 * 1000; // раз в сутки
const KEEP = 14; // хранить последние 14 снимков (≈2 недели истории)

function backupOnce() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(BACKUP_DIR, `data-${stamp}.db`);

    db.prepare(`VACUUM INTO ?`).run(file);
    console.log('[backup] снимок базы:', file);

    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('data-') && f.endsWith('.db'))
      .sort();
    for (const f of files.slice(0, -KEEP)) {
      fs.rm(path.join(BACKUP_DIR, f), { force: true }, () => {});
    }
  } catch (err) {
    // Бэкап — не критичный для работы приложения путь: падение здесь не
    // должно ронять сервер, только громко залогироваться.
    console.warn('[backup] не удалось сделать снимок:', err.message);
  }
}

export function startBackupSchedule() {
  backupOnce(); // сразу при старте — не ждать сутки первого снимка
  setInterval(backupOnce, INTERVAL_MS);
}
