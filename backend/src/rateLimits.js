// Ограничение частоты запросов — защита от флуда/накрутки одним аккаунтом
// или скриптом. Все лимитеры считают по пользователю (req.user.id), если
// он уже известен на момент проверки (после requireAuth), иначе — по IP,
// чтобы не наказывать сразу всех, кто сидит за одним NAT/мобильным интернетом.

import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

function keyByUser(req) {
  return req.user?.id ? `u:${req.user.id}` : ipKeyGenerator(req);
}

function limiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyByUser,
    handler: (req, res) => res.status(429).json({ error: message }),
  });
}

// Общая страховка на все /api-запросы — не мешает обычному использованию,
// но обрывает совсем безумный поток запросов от одного аккаунта.
export const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Слишком много запросов, попробуйте позже',
});

// Загрузка фото (анкета + верификация) — каждая пишет файл на диск.
export const uploadLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Слишком много загрузок фото, попробуйте позже',
});

// Свайпы — с запасом сильно выше того, что реально можно нащёлкать руками.
export const swipeLimiter = limiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Слишком много свайпов подряд, немного помедленнее',
});

// Сообщения в чате.
export const messageLimiter = limiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Слишком много сообщений подряд, немного помедленнее',
});

// Жалобы — в норме редкое действие.
export const reportLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Слишком много жалоб, попробуйте позже',
});

// Вебхук Telegram: своего req.user тут нет (это не наш пользователь), поэтому
// считаем по IP — секрет вебхука уже отсекает посторонних, это вторая линия.
export const webhookLimiter = limiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'too many requests',
});
