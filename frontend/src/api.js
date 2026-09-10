// Клиент нашего API. Все запросы к серверу идут через него.
//
// - подставляет базовый адрес сервера;
// - добавляет заголовок авторизации (Telegram initData или dev-заглушку);
// - разворачивает JSON и кидает ошибку на неуспешный ответ;
// - assetUrl() достраивает адрес картинки с сервера.

import { getInitData } from './telegram';

// Адрес API.
// Пусто = тот же origin, что и страница (в dev Vite проксирует /api и /uploads
// на бэкенд, см. vite.config.js). На проде можно задать VITE_API_URL.
const API_BASE = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const initData = getInitData();
  if (initData) {
    // Внутри Telegram — настоящая подписанная строка.
    return { Authorization: `tma ${initData}` };
  }
  // Локальная разработка вне Telegram — фейковый пользователь №1.
  return { 'X-Dev-User': '1' };
}

async function request(method, path, body) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // сервер обычно отвечает { error: "человеческое сообщение" } — покажем именно его
    let message = `${method} ${path} → ${res.status}`;
    try {
      const body = JSON.parse(text);
      if (body?.error) message = body.error;
      else if (text) message += ` ${text}`;
    } catch {
      if (text) message += ` ${text}`;
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// Загружает бинарный ответ (например, приватное фото) с авторизацией и
// отдаёт Blob. Из него на клиенте делают ссылку через URL.createObjectURL.
async function requestBlob(path) {
  const res = await fetch(`${API_BASE}/api${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const err = new Error(`GET ${path} → ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.blob();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body ?? {}),
  put: (path, body) => request('PUT', path, body ?? {}),
  getBlob: (path) => requestBlob(path),
};

// Абсолютные ссылки (https://..., data:...) — как есть.
// "/uploads/abc.jpg" остаётся относительным: страница сама достроит его
// до своего origin, а Vite/прод-сервер отдаст файл с бэкенда.
export function assetUrl(url) {
  if (!url) return url;
  if (/^(https?:|data:)/.test(url)) return url;
  return API_BASE + url;
}

// Прогоняет все фото анкеты через assetUrl, чтобы компоненты не думали про адреса.
export function normalizeProfile(p) {
  if (!p) return p;
  return { ...p, photos: (p.photos || []).map(assetUrl) };
}

export function normalizeMessage(m) {
  return { ...m, photo: m.photo ? assetUrl(m.photo) : m.photo };
}
