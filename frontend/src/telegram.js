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
