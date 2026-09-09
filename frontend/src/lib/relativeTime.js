// "был(а) в сети N назад" — превращает метку времени в человекочитаемую строку.
//
// ts     — когда человек последний раз был онлайн (мс, как Date.now())
// gender — 'f' -> "была", иначе -> "был"

export function formatLastSeen(ts, gender) {
  const suffix = gender === 'f' ? 'а' : '';
  const prefix = `был${suffix} в сети`;

  const diffMin = Math.floor((Date.now() - ts) / 60000);

  if (diffMin < 1) return `${prefix} только что`;
  if (diffMin < 60) return `${prefix} ${diffMin} мин назад`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${prefix} ${diffHour} ч назад`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return `${prefix} вчера`;
  return `${prefix} ${diffDay} дн назад`;
}
