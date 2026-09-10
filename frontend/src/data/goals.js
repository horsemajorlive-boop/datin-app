// Цель на сайте + отношение к детям.
// В базе хранится короткий код; подписи и «короткие» варианты — тут.
// short — гендерно-нейтральные, показываются на чужих карточках.

export const GOAL = [
  { code: 'friendship', label: 'Дружба и общение', short: 'Дружба' },
  { code: 'date', label: 'Сходить на свидание', short: 'Свидания' },
  { code: 'flirt', label: 'Флирт без отношений', short: 'Флирт' },
  { code: 'relationship', label: 'Построить серьёзные отношения', short: 'Серьёзные отношения' },
];

export const KIDS = [
  { code: 'want', label: 'Хочу детей', short: 'За детей' },
  { code: 'have', label: 'Дети уже есть', short: 'Есть дети' },
  { code: 'dont', label: 'Не хочу детей', short: 'Без детей' },
  { code: 'maybe', label: 'Ещё не решил(а)', short: 'С детьми не решено' },
];

const BY_CODE = Object.fromEntries(
  [
    ...GOAL.map((o) => [`goal:${o.code}`, o]),
    ...KIDS.map((o) => [`kids:${o.code}`, o]),
  ]
);

export const goalShort = (code) => BY_CODE[`goal:${code}`]?.short;
export const kidsShort = (code) => BY_CODE[`kids:${code}`]?.short;
