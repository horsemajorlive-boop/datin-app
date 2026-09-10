// Демо-бот: сид-анкеты (id >= 900000) сами отвечают в чате.
// Это заглушка вместо настоящих людей — чтобы диалог был живым.
// Когда появятся реальные пользователи, этот файл можно выключить.

import { addMessage } from './models.js';

const REPLIES = [
  'Привет! Рад(а), что мы мэтчнулись 🙂',
  'О, у нас совпали интересы!',
  'Как проходит твой день?',
  'Чем обычно занимаешься на выходных?',
  'Полностью согласен(на) 😄',
  'Расскажи о себе побольше!',
  'Интересно! А что ещё?',
  'Ха-ха, точно 😂',
  'Может, как-нибудь сходим за кофе?',
  'Что любишь смотреть или слушать?',
];

const EMOJI = ['😄', '🔥', '❤️', '😉', '🙌', '✨', '😎', '🥰'];

const PHOTOS = [
  'https://picsum.photos/seed/botpic1/400/300',
  'https://picsum.photos/seed/botpic2/400/300',
  'https://picsum.photos/seed/botpic3/400/300',
  'https://picsum.photos/seed/botpic4/400/300',
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Через 1.5–2.5 сек бот пишет ответ в мэтч.
export function scheduleBotReply(matchId, botId) {
  const delay = 1500 + Math.random() * 1000;
  setTimeout(() => {
    const roll = Math.random();
    let payload;
    if (roll < 0.15) payload = { type: 'photo', photo: pick(PHOTOS) };
    else if (roll < 0.35) payload = { type: 'emoji', text: pick(EMOJI) };
    else payload = { type: 'text', text: pick(REPLIES) };

    try {
      addMessage(matchId, botId, payload);
    } catch {
      // мэтч мог быть удалён (отмена свайпа) — тогда просто ничего не делаем
    }
  }, delay);
}
