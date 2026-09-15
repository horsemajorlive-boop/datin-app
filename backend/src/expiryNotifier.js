// Периодическая проверка "Premium скоро закончится" — шлём один пуш за
// сутки до истечения (см. PREMIUM_EXPIRY_WARNING_MS в models.js). Продуктовый
// пробел из отзыва: раньше пользователь узнавал об истечении подписки только
// зайдя в профиль. Никакой отдельной джобы/крона не заводим — простой
// setInterval вполне хватает для масштаба проекта.

import { getPremiumExpiringSoon, markPremiumExpiryNotified } from './models.js';
import { notifyPremiumExpiringSoon } from './notifications.js';

const CHECK_EVERY_MS = 30 * 60 * 1000;

function checkOnce() {
  for (const { userId, premiumUntil } of getPremiumExpiringSoon()) {
    try {
      notifyPremiumExpiringSoon(userId);
    } catch (err) {
      console.warn('[expiryNotifier]', userId, err.message);
    } finally {
      // помечаем отправленным даже при ошибке пуша — иначе мёртвый чат
      // (заблокировал бота и т.п.) будет пытаться слать пуш каждые 30 минут
      markPremiumExpiryNotified(userId, premiumUntil);
    }
  }
}

export function startExpiryNotifier() {
  checkOnce(); // сразу при старте — не ждать первый интервал
  setInterval(checkOnce, CHECK_EVERY_MS);
}
