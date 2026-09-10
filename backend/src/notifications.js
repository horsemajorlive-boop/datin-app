// Когда и о чём слать пуш. Правило: не будим тех, у кого приложение сейчас
// открыто (isConnected) и кто отключил этот тип уведомлений в настройках.

import { notify } from './notify.js';
import { isConnected } from './realtime.js';
import { getNotifyPrefs, partnerOf, getFullProfile } from './models.js';

const away = (userId) => !isConnected(userId);
const nameOf = (userId) => getFullProfile(userId).name || 'кто-то';

export function notifyNewMatch(userA, userB) {
  for (const [me, other] of [
    [userA, userB],
    [userB, userA],
  ]) {
    if (!away(me) || !getNotifyPrefs(me).matches) continue;
    notify(me, `🎉 Новый мэтч — ${nameOf(other)}! Напишите первым.`, {
      buttonText: 'Открыть',
    });
  }
}

export function notifyNewLike(actorId, targetId) {
  if (!away(targetId) || !getNotifyPrefs(targetId).likes) return;
  notify(targetId, '💜 Вы кому-то понравились', { buttonText: 'Посмотреть' });
}

export function notifyNewMessage(matchId, senderId) {
  const recipient = partnerOf(matchId, senderId);
  if (recipient == null || !away(recipient)) return;
  if (!getNotifyPrefs(recipient).messages) return;
  notify(recipient, `💬 Новое сообщение от ${nameOf(senderId)}`, {
    buttonText: 'Ответить',
  });
}
