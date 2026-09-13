// Утилита для работы с Telegram Mini App.
//
// Когда приложение открыто ВНУТРИ Telegram, браузер даёт нам объект
// window.Telegram.WebApp — через него мы узнаём пользователя, тему, размеры и т.д.
//
// Когда мы разрабатываем в ОБЫЧНОМ браузере, этого объекта нет.
// Поэтому везде есть "?." (безопасный доступ) и запасные значения,
// чтобы приложение не падало вне Telegram.

export function getTelegram() {
  if (typeof window === 'undefined') return undefined;
  return window.Telegram?.WebApp;
}

// Вызывается один раз при запуске приложения.
export function initTelegram() {
  const tg = getTelegram();
  if (!tg) return; // мы не в Telegram — просто выходим

  tg.ready();  // говорим Telegram: "интерфейс отрисован, можно показывать"
  tg.expand(); // разворачиваем окно на весь экран
}

// Подписанная строка initData для авторизации на сервере.
// Пустая строка — значит мы не в Telegram (тогда api.js использует dev-заглушку).
export function getInitData() {
  return getTelegram()?.initData || '';
}

// Возвращает текущего пользователя.
export function getCurrentUser() {
  const tgUser = getTelegram()?.initDataUnsafe?.user;

  if (tgUser) {
    return {
      id: tgUser.id,
      name: tgUser.first_name,
      username: tgUser.username ?? null,
    };
  }

  // Заглушка для разработки вне Telegram
  return { id: 0, name: 'Гость', username: 'dev' };
}

// Запрашивает геопозицию для поиска "рядом": сперва через LocationManager
// Telegram (если клиент его поддерживает — так надёжнее на iOS), иначе через
// обычный geolocation браузера (и это же работает в dev вне Telegram).
// Возвращает Promise<{lat, lng}> или бросает ошибку с человеческим текстом.
export function requestLocation() {
  const tg = getTelegram();
  // LocationManager появился в Bot API 8.0 — в старых клиентах (и в нашей
  // dev-заглушке telegram-web-app.js вне Telegram, версия 6.0) объект
  // формально есть, но init() молча ничего не делает и завис бы навсегда.
  const lm =
    tg?.LocationManager && tg.isVersionAtLeast?.('8.0') ? tg.LocationManager : null;

  if (lm) {
    return new Promise((resolve, reject) => {
      lm.init(() => {
        if (!lm.isLocationAvailable) {
          reject(new Error('Геопозиция недоступна на этом устройстве'));
          return;
        }
        lm.getLocation((data) => {
          if (!data) {
            reject(new Error('Доступ к геопозиции не дан'));
            return;
          }
          resolve({ lat: data.latitude, lng: data.longitude });
        });
      });
    });
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(new Error('Геолокация не поддерживается'));
  }
  const GEO_ERRORS = {
    1: 'Доступ к геопозиции запрещён в настройках браузера',
    2: 'Не получилось определить геопозицию',
    3: 'Не получилось определить геопозицию, попробуйте ещё раз',
  };
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(GEO_ERRORS[err.code] || 'Не удалось определить геопозицию')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  });
}
