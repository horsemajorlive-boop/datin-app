// API-сервер приложения знакомств.
//
// Запуск: npm run dev  (перезапускается сам при изменении файлов)
// Здоровье: GET http://localhost:3001/api/health

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { requireAuth } from './auth.js';
import { requireAdmin, isAdmin, bootstrapEnvAdmins } from './admin.js';
import * as model from './models.js';
import { scheduleBotReply } from './bot.js';
import {
  attachRealtime,
  emitMessage,
  emitReaction,
  emitMatch,
  emitSuperlike,
  emitRead,
  emitMessageEdited,
  emitMessageDeleted,
} from './realtime.js';
import { DATA_DIR } from './paths.js';
import {
  notifyNewMatch,
  notifyNewLike,
  notifyNewMessage,
} from './notifications.js';
import { startExpiryNotifier } from './expiryNotifier.js';
import { startBackupSchedule } from './backup.js';
import {
  apiLimiter,
  uploadLimiter,
  swipeLimiter,
  messageLimiter,
  reportLimiter,
  webhookLimiter,
} from './rateLimits.js';

// Что не отловил ни один try/catch (например, в setTimeout у bot.js) — раньше
// такое молча валило процесс без единой строчки в логах. Логируем явно, но не
// падаем: платформа (Railway) сама перезапустит сервис, если станет совсем плохо.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

const here = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Селфи для верификации — в отдельной папке, которая НЕ раздаётся как статика.
// Их видит только админ через защищённый маршрут.
const VERIFY_DIR = path.join(DATA_DIR, 'verification-uploads');
fs.mkdirSync(VERIFY_DIR, { recursive: true });

// Собранный фронтенд (frontend/dist) — на проде отдаём его же с этого сервиса,
// чтобы не поднимать второй хостинг и не думать про CORS. Локально в dev-режиме
// фронтенд обычно поднят отдельно на :5173 (см. README), поэтому если dist ещё
// не собран — просто ничего не подключаем.
const FRONTEND_DIST = path.join(here, '..', '..', 'frontend', 'dist');

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

// За один прокси-хоп (Railway и похожие PaaS) — иначе express-rate-limit не
// может честно определить IP из X-Forwarded-For и откажется работать.
app.set('trust proxy', 1);

// contentSecurityPolicy и frameguard выключаем осознанно: Telegram открывает
// мини-приложение в собственном iframe/webview с чужого домена — стандартные
// X-Frame-Options/CSP frame-ancestors это заблокируют. Остальные защитные
// заголовки helmet (noSniff, hsts, referrerPolicy и т.д.) оставляем как есть.
app.use(helmet({ contentSecurityPolicy: false, frameguard: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '8mb' })); // фото приходят строкой base64, поэтому лимит побольше

// Отдаём загруженные картинки как статику: /uploads/<файл>
app.use('/uploads', express.static(UPLOAD_DIR));

// --- Публичный эндпоинт (без авторизации) ---
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// --- Вебхук Telegram (Stars-платежи) — без нашей авторизации: сюда стучится
// сам Telegram, а не наш фронтенд. Проверяем секрет из setWebhook вместо
// заголовка X-Dev-User/tma. Путь намеренно вне /api, чтобы не попасть
// под общий requireAuth ниже. ---
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

app.post('/telegram/webhook', webhookLimiter, async (req, res) => {
  if (
    TELEGRAM_WEBHOOK_SECRET &&
    req.get('X-Telegram-Bot-Api-Secret-Token') !== TELEGRAM_WEBHOOK_SECRET
  ) {
    return res.sendStatus(401);
  }

  const update = req.body || {};
  try {
    if (update.pre_checkout_query) {
      // Обязаны ответить в течение 10 секунд, иначе Telegram отменит платёж.
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pre_checkout_query_id: update.pre_checkout_query.id, ok: true }),
      });
    } else if (update.message?.successful_payment) {
      const payerId = update.message.from.id;
      const until = model.grantPremium(payerId);
      console.log(`[premium] выдан по оплате: user ${payerId} до ${new Date(until).toISOString()}`);
    }
  } catch (err) {
    console.warn('[telegram webhook]', err.message);
  }
  res.sendStatus(200); // Telegram ретраит, если не 200 — отвечаем всегда
});

// --- Всё, что ниже, требует авторизации ---
// Порядок важен: сначала requireAuth (кладёт req.user), потом apiLimiter —
// иначе лимитер не сможет считать по пользователю и будет считать по IP.
app.use('/api', requireAuth, apiLimiter);

// Своя анкета
app.get('/api/me', (req, res) => {
  res.json({ ...model.getFullProfile(req.user.id), isAdmin: isAdmin(req.user.id) });
});

app.put('/api/me', (req, res) => {
  const before = model.getFullProfile(req.user.id);
  model.saveProfile(req.user.id, req.body || {});
  if (Array.isArray(req.body?.photos)) {
    const nextPhotos = req.body.photos;
    // фото поменялись — раньше подтверждённая галочка больше не действительна
    const changed =
      nextPhotos.length !== before.photos.length ||
      nextPhotos.some((url, i) => url !== before.photos[i]);
    model.setPhotos(req.user.id, nextPhotos);
    // Старые файлы, которых больше нет в новом списке, никому не нужны —
    // без этого backend/uploads только растёт при каждой смене фото анкеты.
    deleteUploadUrls(before.photos.filter((url) => !nextPhotos.includes(url)));
    if (changed && before.verified) model.revokeVerification(req.user.id);
  }
  res.json({ ...model.getFullProfile(req.user.id), isAdmin: isAdmin(req.user.id) });
});

// Настройки: { isVisible?, showOnline? }
app.patch('/api/me/settings', (req, res) => {
  const profile = model.updateSettings(req.user.id, req.body || {});
  res.json({ ...profile, isAdmin: isAdmin(req.user.id) });
});

// Геопозиция для поиска "рядом": { lat, lng } — поделиться, { clear: true } — забыть.
// Координаты наружу никому не отдаются — только расстояние в км (см. getFeed).
app.post('/api/me/location', (req, res) => {
  if (req.body?.clear) {
    model.setLocation(req.user.id, null, null);
    return res.json({ hasLocation: false });
  }
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  const valid =
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  if (!valid) return res.status(400).json({ error: 'некорректные координаты' });
  model.setLocation(req.user.id, lat, lng);
  res.json({ hasLocation: true });
});

// Поднять анкету в поиске (буст, только Premium, лимит в день) — см.
// BOOST_DURATION_MIN/PREMIUM_DAILY_BOOST_LIMIT в models.js.
const BOOST_ERROR_MESSAGES = {
  not_premium: 'Поднятие анкеты доступно с Premium',
  boost_limit: 'Поднятие на сегодня уже использовано — новое будет завтра',
};

app.post('/api/me/boost', (req, res) => {
  const result = model.boostProfile(req.user.id);
  if (result.error) {
    return res.status(403).json({ error: BOOST_ERROR_MESSAGES[result.error] || 'Не получилось поднять анкету' });
  }
  res.json(result);
});

// Счёт на оплату Premium через Telegram Stars. Отдаём ссылку — открывать её
// должен фронтенд через Telegram.WebApp.openInvoice(url). Сама выдача
// Premium происходит не здесь, а в /telegram/webhook — только после того,
// как Telegram подтвердит успешную оплату.
app.post('/api/premium/invoice', async (req, res) => {
  if (!BOT_TOKEN) {
    return res.status(503).json({ error: 'Оплата пока не настроена на сервере' });
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Premium на ${model.PREMIUM_DAYS} дней`,
        description:
          'Безлимитные лайки, больше суперлайков, возврат анкеты, кто вас лайкнул, ' +
          'поднятие анкеты в поиске, сортировка «Новенькие» и поиск по быту',
        payload: `premium:${req.user.id}:${Date.now()}`,
        currency: 'XTR',
        prices: [{ label: 'Premium', amount: model.PREMIUM_PRICE_STARS }],
      }),
    });
    const data = await r.json();
    if (!data.ok) return res.status(502).json({ error: 'Telegram отклонил запрос на счёт' });
    res.json({ url: data.result });
  } catch (err) {
    console.warn('[premium] createInvoiceLink', err.message);
    res.status(502).json({ error: 'Не получилось создать счёт' });
  }
});

// Удалить с диска файлы анкетных фото по их url (только свои /uploads/...,
// внешние картинки сид-ботов трогать нельзя и не нужно).
function deleteUploadUrls(urls) {
  for (const u of urls) {
    if (typeof u === 'string' && u.startsWith('/uploads/')) {
      fs.rm(path.join(UPLOAD_DIR, path.basename(u)), { force: true }, () => {});
    }
  }
}

// Удалить аккаунт целиком: БД (каскадом) + файлы на диске. Общая для
// собственного "Удалить аккаунт" и для админского удаления чужого.
function deleteAccountEverywhere(userId) {
  const { uploadFiles, verificationFile } = model.deleteAccount(userId);
  deleteUploadUrls(uploadFiles);
  if (verificationFile) {
    fs.rm(
      path.join(VERIFY_DIR, path.basename(verificationFile)),
      { force: true },
      () => {}
    );
  }
}

app.delete('/api/me', (req, res) => {
  deleteAccountEverywhere(req.user.id);
  res.json({ ok: true });
});

// Обязательный вход: принять правила + подтвердить 18 + имя/возраст/пол + фото.
// { acceptAge, acceptRules, name, age, gender, photos: [url] }
app.post('/api/onboarding', (req, res) => {
  const before = model.getFullProfile(req.user.id);
  const out = model.acceptOnboarding(req.user.id, req.body || {});
  if (out.error) return res.status(400).json({ error: out.error });
  // Если это повторная попытка входа (уже были фото до этой) — старые,
  // которых нет в новом наборе, больше не нужны на диске.
  deleteUploadUrls(before.photos.filter((url) => !out.profile.photos.includes(url)));
  res.json({ ...out.profile, isAdmin: isAdmin(req.user.id) });
});

// --- Верификация фото (ручная модерация) ---

// Пользователь присылает селфи: { dataUrl, pose }. Возвращаем свежую анкету.
app.post('/api/verification', uploadLimiter, (req, res) => {
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

// --- Жалобы (только админ) ---

app.get('/api/admin/reports', requireAdmin, (req, res) => {
  res.json(model.getOpenReports());
});

// Пометить жалобу разобранной
app.post('/api/admin/reports/:id/review', requireAdmin, (req, res) => {
  const out = model.reviewReport(Number(req.params.id), req.user.id);
  if (out.error) return res.status(404).json({ error: out.error });
  res.json(out);
});

// Быстро скрыть анкету пользователя из поиска: { userId }
app.post('/api/admin/hide-profile', requireAdmin, (req, res) => {
  const userId = Number(req.body?.userId);
  if (!userId) return res.status(400).json({ error: 'bad userId' });
  res.json(model.hideProfile(userId));
});

// Намеренно НЕТ маршрутов "список всех анкет" / "удалить любого" /
// "почитать чужую переписку" — даже у настоящего админа. Модерация идёт
// только через очереди (верификации, жалобы), где по каждому пользователю
// есть конкретный повод — так один скомпрометированный/угаданный вход
// не даёт разом почистить или прочитать всю базу.

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
      goal: q.goal,
      kids: q.kids,
      heightMin: q.heightMin ? Number(q.heightMin) : undefined,
      heightMax: q.heightMax ? Number(q.heightMax) : undefined,
      smoking: q.smoking,
      drinking: q.drinking,
      verified: q.verified ? true : undefined,
      sort: q.sort,
      radiusKm: q.radiusKm ? Number(q.radiusKm) : undefined,
    })
  );
});

// Свайп: { targetId, direction: 'like' | 'pass', superlike?: boolean }
// Лайки (и отдельно суперлайки) ограничены дневной нормой — см. DAILY_LIKE_LIMIT
// в models.js. Лимит исчерпан -> 429, свайп не записывается.
const LIMIT_MESSAGES = {
  like_limit: 'Дневной лимит лайков исчерпан — возвращайтесь завтра',
  superlike_limit: 'Суперлайк на сегодня уже использован',
};

app.post('/api/swipes', swipeLimiter, (req, res) => {
  const targetId = Number(req.body?.targetId);
  const direction = req.body?.direction === 'like' ? 'like' : 'pass';
  const isSuper = direction === 'like' && !!req.body?.superlike;
  const message = isSuper ? req.body?.message : undefined;
  if (!targetId || targetId === req.user.id) {
    return res.status(400).json({ error: 'bad targetId' });
  }
  const result = model.recordSwipe(req.user.id, targetId, direction, { isSuper, message });
  if (result.error) {
    return res.status(429).json({ error: LIMIT_MESSAGES[result.error] || 'Лимит исчерпан' });
  }
  res.json(result);

  if (result.match) {
    // Новый мэтч — сообщаем обоим по WebSocket (список мэтчей обновится сам).
    emitMatch([req.user.id, targetId]);
    notifyNewMatch(req.user.id, targetId);
  } else if (direction === 'like') {
    notifyNewLike(req.user.id, targetId, { isSuper });
    if (isSuper) emitSuperlike(targetId); // обновить вкладку "Суперлайки" у получателя
  }
});

// Суперлайки, которые ждут ответа (вкладка "Суперлайки" в чате) — доступно
// всем, не только Premium: это отдельный, бесплатный способ получить мэтч.
app.get('/api/superlikes/incoming', (req, res) => {
  res.json(model.getPendingSuperlikes(req.user.id));
});

// Ответить взаимностью на суперлайк ("Взаимно") — мгновенный мэтч без
// Premium и без учёта дневного лимита лайков: { actorId в URL }.
app.post('/api/superlikes/:actorId/reciprocate', swipeLimiter, (req, res) => {
  const actorId = Number(req.params.actorId);
  if (!actorId) return res.status(400).json({ error: 'bad actorId' });
  const result = model.respondToSuperlike(req.user.id, actorId);
  if (result.error) {
    return res.status(400).json({ error: 'Суперлайк не найден или уже обработан' });
  }
  res.json(result);
  emitMatch([req.user.id, actorId]);
  notifyNewMatch(req.user.id, actorId);
});

// Отмена свайпа ("вернуть", только Premium): { targetId }
app.post('/api/swipes/undo', (req, res) => {
  const targetId = Number(req.body?.targetId);
  if (!targetId) return res.status(400).json({ error: 'bad targetId' });
  const result = model.undoSwipe(req.user.id, targetId);
  if (result.error) {
    return res.status(403).json({ error: 'Возврат анкеты доступен с Premium' });
  }
  res.json(result);
});

// --- Блокировки и жалобы ---

// Заблокировать: { userId }
app.post('/api/block', (req, res) => {
  const targetId = Number(req.body?.userId);
  if (!targetId) return res.status(400).json({ error: 'bad userId' });
  const out = model.blockUser(req.user.id, targetId);
  if (out.error) return res.status(400).json({ error: out.error });
  res.json(out);
});

// Разблокировать: { userId }
app.post('/api/unblock', (req, res) => {
  const targetId = Number(req.body?.userId);
  if (!targetId) return res.status(400).json({ error: 'bad userId' });
  res.json(model.unblockUser(req.user.id, targetId));
});

// Кого я заблокировал
app.get('/api/blocked', (req, res) => {
  res.json(model.getBlockedList(req.user.id));
});

// Пожаловаться: { userId, reason, note? } — заодно блокирует
app.post('/api/report', reportLimiter, (req, res) => {
  const targetId = Number(req.body?.userId);
  if (!targetId) return res.status(400).json({ error: 'bad userId' });
  const out = model.createReport(
    req.user.id,
    targetId,
    String(req.body?.reason || ''),
    req.body?.note
  );
  if (out.error) return res.status(400).json({ error: out.error });
  res.json(out);
});

// Кто лайкнул вас и ждёт ответа (вкладка "Симпатии")
app.get('/api/likes/incoming', (req, res) => {
  res.json(model.getIncomingLikes(req.user.id));
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

// Отметить переписку прочитанной (открыл чат / увидел новое сообщение).
app.post('/api/matches/:id/read', (req, res) => {
  const matchId = Number(req.params.id);
  const out = model.markMatchRead(matchId, req.user.id);
  if (out === null) return res.status(403).json({ error: 'not your match' });
  res.json(out);

  emitRead(matchId, req.user.id);
});

// Разматчиться — без жалобы и без блокировки (для этого есть /api/report).
app.post('/api/matches/:id/unmatch', (req, res) => {
  const out = model.unmatch(Number(req.params.id), req.user.id);
  if (out === null) return res.status(403).json({ error: 'not your match' });
  res.json(out);
});

// Отправить сообщение: { type, text?, photo? }
app.post('/api/matches/:id/messages', messageLimiter, (req, res) => {
  const matchId = Number(req.params.id);
  const msg = model.addMessage(matchId, req.user.id, req.body || {});
  if (msg === null) return res.status(403).json({ error: 'not your match' });
  res.status(201).json(msg);

  // Доставляем сообщение собеседнику мгновенно + пуш, если он не в приложении.
  emitMessage(matchId, msg, req.user.id);
  notifyNewMessage(matchId, req.user.id);

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

const MESSAGE_EDIT_ERRORS = {
  deleted: 'Сообщение уже удалено',
  not_editable: 'Это сообщение нельзя редактировать',
  empty: 'Сообщение не может быть пустым',
};

// Отредактировать своё сообщение: { text }
app.patch('/api/messages/:id', (req, res) => {
  const out = model.editMessage(Number(req.params.id), req.user.id, req.body?.text);
  if (out === null) return res.status(403).json({ error: 'not your message' });
  if (out.error) {
    return res.status(400).json({ error: MESSAGE_EDIT_ERRORS[out.error] || 'Не удалось изменить' });
  }
  res.json(out);

  emitMessageEdited(out.matchId, out.id, out.text, out.editedAt, req.user.id);
});

// Удалить своё сообщение (остаётся заглушка "сообщение удалено" — см. deleteMessage).
app.delete('/api/messages/:id', (req, res) => {
  const out = model.deleteMessage(Number(req.params.id), req.user.id);
  if (out === null) return res.status(403).json({ error: 'not your message' });
  res.json(out);

  emitMessageDeleted(out.matchId, out.id, req.user.id);
});

// Загрузка фото: { dataUrl: "data:image/jpeg;base64,..." } -> { url }
app.post('/api/upload', uploadLimiter, (req, res) => {
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

// Отдаём собранный фронтенд, если он есть (npm run build в frontend/) —
// маршрут должен идти ПОСЛЕ всех /api, /uploads, /telegram выше по файлу.
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // Без пути — просто мидлвар-заглушка на любой оставшийся GET (Express 5
  // больше не понимает голую '*' как путь маршрута, см. path-to-regexp v6+).
  app.use((req, res, next) => {
    if (
      req.method !== 'GET' ||
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/telegram')
    ) {
      return next();
    }
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
  console.log('[api] отдаю собранный фронтенд из', FRONTEND_DIST);
}

// Единый обработчик ошибок — последний мидлвар. Express 5 сам передаёт сюда
// отклонённые промисы из роутов, так что try/catch в каждом роуте не нужен:
// без этого такая ошибка падала бы наружу без единообразного JSON-ответа.
app.use((err, req, res, next) => {
  console.error('[api error]', req.method, req.path, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

bootstrapEnvAdmins(); // проставить is_admin тем, кто в ADMIN_IDS

const PORT = Number(process.env.PORT) || 3001;
const server = app.listen(PORT, () => {
  console.log(`[api] http://localhost:${PORT}`);
  if (process.env.ALLOW_DEV_AUTH === 'true') {
    console.log('[api] DEV-авторизация включена (X-Dev-User / ?dev=)');
  }
  // Фоновые задачи запускаем только ПОСЛЕ того, как сервер реально начал
  // слушать порт — иначе на медленном старте можно не уложиться в таймаут
  // health-check Railway, и деплой посчитают упавшим, хотя процесс просто
  // ещё поднимался.
  startExpiryNotifier(); // напоминание "Premium скоро закончится"
  startBackupSchedule(); // периодический снимок базы — по логам Railway не при чём,
  // видно, что контейнер спокойно жил 10+ минут; см. graceful shutdown ниже
});

// Подключаем WebSocket к тому же серверу.
attachRealtime(server);

// Railway (как и любой оркестратор контейнеров) шлёт SIGTERM при штатной
// замене деплоя новой версией — это НЕ падение приложения. Но Node по
// умолчанию не ловит SIGTERM и просто убивается им; npm-обёртка (npm start)
// репортует это как "npm error signal SIGTERM" / "command failed", из-за
// чего Railway помечает совершенно нормальную замену версии как "Deployment
// crashed" в активности проекта (см. логи — сервер работал без единой
// ошибки, потом просто получил "Stopping Container"). Ловим сигнал и
// завершаемся сами через process.exit(0) — тогда выход чистый, без сигнала.
function gracefulShutdown(signal) {
  console.log(`[api] получен ${signal} — завершаемся штатно`);
  server.close(() => process.exit(0));
  // не ждём вечно, если что-то зависло (открытые WS-соединения и т.п.)
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
