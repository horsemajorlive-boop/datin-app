// API-сервер приложения знакомств.
//
// Запуск: npm run dev  (перезапускается сам при изменении файлов)
// Здоровье: GET http://localhost:3001/api/health

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { requireAuth } from './auth.js';
import { requireAdmin, isAdmin } from './admin.js';
import * as model from './models.js';
import { scheduleBotReply } from './bot.js';
import { attachRealtime, emitMessage, emitReaction, emitMatch } from './realtime.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(here, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Селфи для верификации — в отдельной папке, которая НЕ раздаётся как статика.
// Их видит только админ через защищённый маршрут.
const VERIFY_DIR = path.join(here, '..', 'verification-uploads');
fs.mkdirSync(VERIFY_DIR, { recursive: true });

// Разбирает "data:image/...;base64,..." и пишет файл в dir. { file } либо { error, status }.
function writeImageDataUrl(dataUrl, dir) {
  const m = String(dataUrl || '').match(
    /^data:image\/(png|jpe?g|webp);base64,(.+)$/
  );
  if (!m) return { error: 'bad dataUrl', status: 400 };
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 6 * 1024 * 1024) return { error: 'too big', status: 413 };
  const file = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(dir, file), buf);
  return { file };
}

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '8mb' })); // фото приходят строкой base64, поэтому лимит побольше

// Отдаём загруженные картинки как статику: /uploads/<файл>
app.use('/uploads', express.static(UPLOAD_DIR));

// --- Публичный эндпоинт (без авторизации) ---
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// --- Всё, что ниже, требует авторизации ---
app.use('/api', requireAuth);

// Своя анкета
app.get('/api/me', (req, res) => {
  res.json({ ...model.getFullProfile(req.user.id), isAdmin: isAdmin(req.user.id) });
});

app.put('/api/me', (req, res) => {
  const before = model.getFullProfile(req.user.id);
  model.saveProfile(req.user.id, req.body || {});
  if (Array.isArray(req.body?.photos)) {
    // фото поменялись — раньше подтверждённая галочка больше не действительна
    const changed =
      req.body.photos.length !== before.photos.length ||
      req.body.photos.some((url, i) => url !== before.photos[i]);
    model.setPhotos(req.user.id, req.body.photos);
    if (changed && before.verified) model.revokeVerification(req.user.id);
  }
  res.json({ ...model.getFullProfile(req.user.id), isAdmin: isAdmin(req.user.id) });
});

// Обязательный вход: принять правила + подтвердить 18 + имя/возраст/пол + фото.
// { acceptAge, acceptRules, name, age, gender, photos: [url] }
app.post('/api/onboarding', (req, res) => {
  const out = model.acceptOnboarding(req.user.id, req.body || {});
  if (out.error) return res.status(400).json({ error: out.error });
  res.json(out.profile);
});

// --- Верификация фото (ручная модерация) ---

// Пользователь присылает селфи: { dataUrl, pose }. Возвращаем свежую анкету.
app.post('/api/verification', (req, res) => {
  const out = writeImageDataUrl(req.body?.dataUrl, VERIFY_DIR);
  if (out.error) return res.status(out.status).json({ error: out.error });
  model.submitVerification(req.user.id, out.file, req.body?.pose);
  res
    .status(201)
    .json({ ...model.getFullProfile(req.user.id), isAdmin: isAdmin(req.user.id) });
});

// Очередь на модерацию (только админ).
app.get('/api/admin/verifications', requireAdmin, (req, res) => {
  res.json(model.getPendingVerifications());
});

// Селфи конкретной заявки (только админ). Отдаём файл из приватной папки.
app.get('/api/admin/verifications/:userId/photo', requireAdmin, (req, res) => {
  const file = model.getVerificationFile(Number(req.params.userId));
  if (!file) return res.status(404).json({ error: 'нет фото' });
  res.sendFile(path.join(VERIFY_DIR, file));
});

// Решение админа: { decision: 'approve' | 'reject' }
app.post('/api/admin/verifications/:userId/review', requireAdmin, (req, res) => {
  const decision = req.body?.decision === 'approve' ? 'approve' : 'reject';
  const out = model.reviewVerification(
    Number(req.params.userId),
    req.user.id,
    decision
  );
  if (out.error) return res.status(404).json({ error: out.error });
  res.json(out);
});

// Лента для свайпов (+ необязательные фильтры в query-параметрах)
app.get('/api/feed', (req, res) => {
  const q = req.query;
  res.json(
    model.getFeed(req.user.id, {
      limit: q.limit,
      ageMin: q.ageMin ? Number(q.ageMin) : undefined,
      ageMax: q.ageMax ? Number(q.ageMax) : undefined,
      city: q.city ? String(q.city).trim().slice(0, 60) : undefined,
      gender: q.gender,
      housing: q.housing ? String(q.housing).split(',') : undefined,
      car: q.car,
      employment: q.employment,
      heightMin: q.heightMin ? Number(q.heightMin) : undefined,
      heightMax: q.heightMax ? Number(q.heightMax) : undefined,
      smoking: q.smoking,
      drinking: q.drinking,
      verified: q.verified ? true : undefined,
      sort: q.sort,
    })
  );
});

// Свайп: { targetId, direction: 'like' | 'pass' }
app.post('/api/swipes', (req, res) => {
  const targetId = Number(req.body?.targetId);
  const direction = req.body?.direction === 'like' ? 'like' : 'pass';
  if (!targetId || targetId === req.user.id) {
    return res.status(400).json({ error: 'bad targetId' });
  }
  const result = model.recordSwipe(req.user.id, targetId, direction);
  res.json(result);

  // Новый мэтч — сообщаем обоим по WebSocket (список мэтчей обновится сам).
  if (result.match) emitMatch([req.user.id, targetId]);
});

// Отмена свайпа ("вернуть"): { targetId }
app.post('/api/swipes/undo', (req, res) => {
  const targetId = Number(req.body?.targetId);
  if (!targetId) return res.status(400).json({ error: 'bad targetId' });
  model.undoSwipe(req.user.id, targetId);
  res.json({ ok: true });
});

// Кого я лайкнул (вкладка "Симпатии")
app.get('/api/likes', (req, res) => {
  res.json(model.getMyLikes(req.user.id));
});

// Список мэтчей
app.get('/api/matches', (req, res) => {
  res.json(model.getMatches(req.user.id));
});

// Сообщения одного мэтча
app.get('/api/matches/:id/messages', (req, res) => {
  const list = model.getMessages(Number(req.params.id), req.user.id);
  if (list === null) return res.status(403).json({ error: 'not your match' });
  res.json(list);
});

// Отправить сообщение: { type, text?, photo? }
app.post('/api/matches/:id/messages', (req, res) => {
  const matchId = Number(req.params.id);
  const msg = model.addMessage(matchId, req.user.id, req.body || {});
  if (msg === null) return res.status(403).json({ error: 'not your match' });
  res.status(201).json(msg);

  // Доставляем сообщение собеседнику мгновенно.
  emitMessage(matchId, msg, req.user.id);

  // Демо: если собеседник — сид-бот (id >= 900000), он ответит через пару секунд.
  const partner = model.partnerOf(matchId, req.user.id);
  if (partner && partner >= 900000) scheduleBotReply(matchId, partner);
});

// Реакция на сообщение: { emoji }
app.post('/api/messages/:id/reaction', (req, res) => {
  const out = model.setReaction(
    Number(req.params.id),
    req.user.id,
    String(req.body?.emoji || '')
  );
  if (out === null) return res.status(403).json({ error: 'not allowed' });
  res.json(out);

  emitReaction(out.matchId, out.messageId, out.reaction, req.user.id);
});

// Загрузка фото: { dataUrl: "data:image/jpeg;base64,..." } -> { url }
app.post('/api/upload', (req, res) => {
  const dataUrl = String(req.body?.dataUrl || '');
  const m = dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
  if (!m) return res.status(400).json({ error: 'bad dataUrl' });

  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 6 * 1024 * 1024) {
    return res.status(413).json({ error: 'too big' });
  }

  const name = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  res.status(201).json({ url: `/uploads/${name}` });
});

const PORT = Number(process.env.PORT) || 3001;
const server = app.listen(PORT, () => {
  console.log(`[api] http://localhost:${PORT}`);
  if (process.env.ALLOW_DEV_AUTH === 'true') {
    console.log('[api] DEV-авторизация включена (X-Dev-User / ?dev=)');
  }
});

// Подключаем WebSocket к тому же серверу.
attachRealtime(server);
