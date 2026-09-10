// Отправка пуш-уведомлений через бота Telegram.
//
// userId у нас совпадает с telegram-id, значит это и есть chat_id для sendMessage.
// Пока BOT_TOKEN не задан (локальная разработка) — просто пишем в лог, ничего
// не отправляя. Когда впишете токен от @BotFather — уведомления пойдут в Telegram.
//
// MINI_APP_URL (необязательно) — https-адрес мини-приложения; если задан,
// к сообщению прикрепляется кнопка, открывающая приложение.

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const MINI_APP_URL = process.env.MINI_APP_URL || '';

export async function notify(userId, text, { buttonText } = {}) {
  if (!BOT_TOKEN) {
    console.log(`[notify] → ${userId}: ${text}`);
    return;
  }

  const body = { chat_id: userId, text };
  if (buttonText && MINI_APP_URL) {
    body.reply_markup = {
      inline_keyboard: [[{ text: buttonText, web_app: { url: MINI_APP_URL } }]],
    };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      // 403 = пользователь не начинал диалог с ботом — это нормально, не ошибка
      console.warn(
        '[notify] telegram',
        res.status,
        await res.text().catch(() => '')
      );
    }
  } catch (err) {
    console.warn('[notify] не удалось отправить:', err.message);
  }
}
