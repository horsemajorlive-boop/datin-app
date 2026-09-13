// Единая точка для путей к постоянным данным — БД и загруженные файлы.
// На проде (Railway и т.п.) сюда монтируется один persistent volume, поэтому
// всё, что должно переживать перезапуск/редеплой, лежит под одним DATA_DIR.
// Локально по умолчанию — папка backend/, как было раньше.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = process.env.DATA_DIR || path.join(here, '..');
