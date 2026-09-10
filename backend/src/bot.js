// Демо-бот: сид-анкеты (id >= 900000) сами отвечают в чате.
// Заглушка вместо настоящих людей — чтобы диалог был живым.

import { addMessage } from './models.js';
import { emitMessage, emitTyping } from './realtime.js';
import { notifyNewMessage } from './notifications.js';

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

export function scheduleBotReply(matchId, botId) {
  // Решаем заранее, что бот "делает": от этого зависит и статус, и тип ответа.
  const roll = Math.random();
  const kind = roll < 0.15 ? 'photo' : roll < 0.35 ? 'emoji' : 'typing';

  // Через 0.4 сек показываем собеседнику статус "печатает / выбирает фото…".
  setTimeout(() => emitTyping(matchId, botId, kind), 400);

  // Через 1.5–2.5 сек — сам ответ.
  setTimeout(
    () => {
      let payload;
      if (kind === 'photo') payload = { type: 'photo', photo: pick(PHOTOS) };
      else if (kind === 'emoji') payload = { type: 'emoji', text: pick(EMOJI) };
      else payload = { type: 'text', text: pick(REPLIES) };

      try {
        const msg = addMessage(matchId, botId, payload);
        if (msg) {
          emitMessage(matchId, msg, botId);
          notifyNewMessage(matchId, botId);
        }
      } catch {
        // мэтч мог быть удалён (отмена свайпа) — тогда просто ничего не делаем
      }
    },
    1500 + Math.random() * 1000
  );
}
