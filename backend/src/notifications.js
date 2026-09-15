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

export function notifyNewLike(actorId, targetId, { isSuper = false } = {}) {
  if (!away(targetId) || !getNotifyPrefs(targetId).likes) return;
  const text = isSuper ? '🌟 Вас суперлайкнули!' : '💜 Вы кому-то понравились';
  notify(targetId, text, { buttonText: 'Посмотреть' });
}

export function notifyNewMessage(matchId, senderId) {
  const recipient = partnerOf(matchId, senderId);
  if (recipient == null || !away(recipient)) return;
  if (!getNotifyPrefs(recipient).messages) return;
  notify(recipient, `💬 Новое сообщение от ${nameOf(senderId)}`, {
    buttonText: 'Ответить',
  });
}

// Premium заканчивается меньше чем через сутки — см. expiryNotifier.js.
// Отдельной настройки на этот пуш нет (это не соцактивность, а статус
// собственного аккаунта), поэтому notify_* сюда не смотрим — только "away".
export function notifyPremiumExpiringSoon(userId) {
  if (!away(userId)) return;
  notify(
    userId,
    '⏳ Premium заканчивается меньше чем через сутки — продлите, чтобы не потерять возможности',
    { buttonText: 'Продлить' }
  );
}
