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

// Суперлайк — отдельная настройка от обычных "симпатий" (notify_superlikes),
// и, в отличие от обычного лайка, показываем превью сообщения — это и есть
// весь смысл вкладки "Суперлайки" (см. getPendingSuperlikes в models.js).
export const SUPERLIKE_PREVIEW_LEN = 80;

export function notifyNewSuperlike(actorId, targetId, message) {
  if (!away(targetId) || !getNotifyPrefs(targetId).superlikes) return;
  const name = nameOf(actorId);
  const trimmed = String(message || '').trim();
  const preview =
    trimmed.length > SUPERLIKE_PREVIEW_LEN
      ? `${trimmed.slice(0, SUPERLIKE_PREVIEW_LEN)}…`
      : trimmed;
  const text = preview
    ? `🌟 Суперлайк от ${name}: «${preview}»`
    : `🌟 Суперлайк от ${name}!`;
  notify(targetId, text, { buttonText: 'Посмотреть' });
}

// Ответили взаимностью на ваш суперлайк ("Взаимно", см. respondToSuperlike) —
// та же общая настройка notify_matches (это в первую очередь мэтч), но текст
// отдельный: приятно знать, что сработал именно суперлайк, а не случайность.
export function notifyMutualSuperlike(superlikerId, reciprocatorId) {
  if (away(reciprocatorId) && getNotifyPrefs(reciprocatorId).matches) {
    notify(reciprocatorId, `🎉 Новый мэтч — ${nameOf(superlikerId)}! Напишите первым.`, {
      buttonText: 'Открыть',
    });
  }
  if (away(superlikerId) && getNotifyPrefs(superlikerId).matches) {
    notify(superlikerId, `🎉 ${nameOf(reciprocatorId)} ответил(а) взаимностью на ваш суперлайк!`, {
      buttonText: 'Открыть',
    });
  }
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
