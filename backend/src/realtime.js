// Реальное время через WebSocket.
//
// Один WS-сервер живёт на том же порту, что и API, по пути /ws.
// Браузер не может ставить заголовки на WebSocket, поэтому авторизация —
// параметром в адресе: ws://host/ws?initData=... (или ?dev=1 в разработке).
//
// Кто на связи: clients = Map<userId, Set<ws>>  (у пользователя может быть
// несколько вкладок).
//
// События серверу → клиенту:
//   { type: 'message',  matchId, message }     — новое сообщение
//   { type: 'reaction', matchId, messageId, reaction }
//   { type: 'typing',   matchId, kind }        — собеседник печатает/выбирает
//   { type: 'presence', userId, online }       — кто-то зашёл/вышел
//   { type: 'match' }                          — появился новый мэтч (перезагрузить список)
//   { type: 'read', matchId }                  — собеседник прочитал переписку
//   { type: 'messageEdited', matchId, messageId, text, editedAt }
//   { type: 'messageDeleted', matchId, messageId }
//
// Событие клиента → серверу:
//   { type: 'typing', matchId, kind }          — я печатаю в этом чате

import { WebSocketServer } from 'ws';
import { validateInitData } from './auth.js';
import { matchUsers, matchPartners, partnerOf, touchUser } from './models.js';

const DEV_AUTH = process.env.ALLOW_DEV_AUTH === 'true';
const clients = new Map();

// Открыт ли у пользователя сейчас хотя бы один WebSocket (т.е. приложение открыто).
export const isConnected = (userId) => clients.has(Number(userId));

export function attachRealtime(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const params = new URL(req.url, 'http://x').searchParams;

    let user = validateInitData(params.get('initData') || '');
    if (!user && DEV_AUTH) {
      user = { id: Number(params.get('dev') || 1) };
    }
    if (!user?.id) {
      ws.close(4001, 'unauthorized');
      return;
    }

    const userId = user.id;
    if (!clients.has(userId)) clients.set(userId, new Set());
    const mySockets = clients.get(userId);
    const wasOffline = mySockets.size === 0;
    mySockets.add(ws);

    touchUser(userId);
    if (wasOffline) broadcastPresence(userId, true);

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (msg.type === 'typing' && msg.matchId) {
        const matchId = Number(msg.matchId);
        // отправляем дальше, только если пользователь действительно в этом мэтче
        if (partnerOf(matchId, userId) != null) {
          emitTyping(matchId, userId, msg.kind || 'typing');
        }
      }
    });

    ws.on('close', () => {
      mySockets.delete(ws);
      if (mySockets.size === 0) {
        clients.delete(userId);
        touchUser(userId);
        broadcastPresence(userId, false);
      }
    });

    ws.on('error', () => {});
  });

  console.log('[ws] realtime на /ws');
}

// ---------- отправка ----------

function sendToUser(userId, payload) {
  const set = clients.get(userId);
  if (!set) return;
  const data = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

// Всем участникам мэтча, кроме exceptUserId.
function sendToMatch(matchId, payload, exceptUserId) {
  const pair = matchUsers(matchId);
  if (!pair) return;
  for (const uid of pair) {
    if (uid !== exceptUserId) sendToUser(uid, payload);
  }
}

// ---------- события (зовут server.js и bot.js) ----------

export function emitMessage(matchId, message, senderId) {
  // получателю сообщение всегда "от собеседника"
  sendToMatch(
    matchId,
    { type: 'message', matchId, message: { ...message, from: 'them' } },
    senderId
  );
}

export function emitReaction(matchId, messageId, reaction, byUserId) {
  sendToMatch(
    matchId,
    { type: 'reaction', matchId, messageId, reaction },
    byUserId
  );
}

export function emitTyping(matchId, fromUserId, kind) {
  sendToMatch(matchId, { type: 'typing', matchId, kind }, fromUserId);
}

// Собеседник открыл чат и прочитал переписку — партнёру нужно перерисовать
// "Прочитано" под своим последним сообщением, не дожидаясь ручного обновления.
export function emitRead(matchId, byUserId) {
  sendToMatch(matchId, { type: 'read', matchId }, byUserId);
}

export function emitMessageEdited(matchId, messageId, text, editedAt, byUserId) {
  sendToMatch(matchId, { type: 'messageEdited', matchId, messageId, text, editedAt }, byUserId);
}

export function emitMessageDeleted(matchId, messageId, byUserId) {
  sendToMatch(matchId, { type: 'messageDeleted', matchId, messageId }, byUserId);
}

export function emitMatch(userIds) {
  for (const uid of userIds) sendToUser(uid, { type: 'match' });
}

function broadcastPresence(userId, online) {
  const payload = { type: 'presence', userId, online };
  for (const partnerId of matchPartners(userId)) {
    sendToUser(partnerId, payload);
  }
}
