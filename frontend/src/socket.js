// Живое соединение с сервером (WebSocket).
//
// Держит один сокет на всё приложение, сам переподключается при обрыве.
// Подписка на события — onSocket(type, fn), отправка — sendSocket(obj).

import { getInitData } from './telegram';

// Адрес WebSocket. По умолчанию — тот же хост, что и страница
// (в dev Vite проксирует /ws на бэкенд). http:// -> ws://, https:// -> wss://.
const WS_BASE = (import.meta.env.VITE_API_URL || window.location.origin).replace(
  /^http/,
  'ws'
);

let ws = null;
let reconnectTimer = null;
const handlers = new Map(); // type -> Set<fn>

function buildUrl() {
  const initData = getInitData();
  const query = initData
    ? `initData=${encodeURIComponent(initData)}`
    : 'dev=1'; // локальная разработка вне Telegram
  return `${WS_BASE}/ws?${query}`;
}

export function connectSocket() {
  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  ws = new WebSocket(buildUrl());

  ws.onopen = () => emit('open');

  ws.onclose = () => {
    emit('close');
    // переподключаемся через 2 сек
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectSocket, 2000);
  };

  ws.onerror = () => {}; // onclose всё равно сработает

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    emit(msg.type, msg);
  };
}

// Подписаться на событие. Возвращает функцию-отписку.
export function onSocket(type, fn) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type).add(fn);
  return () => handlers.get(type)?.delete(fn);
}

function emit(type, payload) {
  handlers.get(type)?.forEach((fn) => fn(payload));
}

export function sendSocket(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}
