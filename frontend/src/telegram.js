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

// Реальная видимая высота окна внутри Telegram (CSS-переменная --tg-vh) —
// 100dvh сам по себе на части клиентов (особенно Android-WebView) не
// учитывает "родное" пространство Telegram (шапка, индикатор сворачивания),
// из-за чего нижняя часть экрана — строка ввода в чате, панель подсказок —
// визуально уезжала за пределы видимой области и наслаивалась на нижнюю
// навигацию. Официальная рекомендация Telegram — ориентироваться на
// viewportStableHeight и переотрисовывать при событии viewportChanged.
function syncViewportHeight() {
  const tg = getTelegram();
  const h =
    tg?.viewportStableHeight ||
    tg?.viewportHeight ||
    window.visualViewport?.height ||
    window.innerHeight;
  document.documentElement.style.setProperty('--tg-vh', `${h}px`);
}

// Одной высоты недостаточно: на части Android-клиентов собственная шапка
// Telegram (крестик/название/свернуть) не "выталкивает" контент вниз, а
// ЛОЖИТСЯ ПОВЕРХ него — верх нашего приложения (шапка чата) оказывается
// частично под ней, а значит низ (строка ввода) выталкивается за пределы
// экрана ровно на ту же величину. contentSafeAreaInset — это официально
// как раз про наложение СВОЕГО UI Telegram поверх контента мини-аппа
// (в отличие от safeAreaInset — это про системные вырезы/плашки устройства).
// Отступаем от обоих про запас — там, где они не нужны, значение просто 0.
function syncSafeArea() {
  const tg = getTelegram();
  const safe = tg?.safeAreaInset || {};
  const content = tg?.contentSafeAreaInset || {};
  const root = document.documentElement.style;
  root.setProperty('--tg-safe-top', `${(safe.top || 0) + (content.top || 0)}px`);
  root.setProperty('--tg-safe-bottom', `${(safe.bottom || 0) + (content.bottom || 0)}px`);
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', syncViewportHeight);
  window.visualViewport?.addEventListener('resize', syncViewportHeight);
}

// Вызывается один раз при запуске приложения.
export function initTelegram() {
  const tg = getTelegram();
  if (!tg) return; // мы не в Telegram — просто выходим

  tg.ready();  // говорим Telegram: "интерфейс отрисован, можно показывать"
  tg.expand(); // разворачиваем окно на весь экран
  tg.disableVerticalSwipes?.(); // свайп вниз не должен конфликтовать со скроллом чата/закрывать приложение

  syncViewportHeight();
  syncSafeArea();
  tg.onEvent?.('viewportChanged', syncViewportHeight);
  tg.onEvent?.('safeAreaChanged', syncSafeArea);
  tg.onEvent?.('contentSafeAreaChanged', syncSafeArea);
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
