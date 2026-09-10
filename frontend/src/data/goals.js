// Цели знакомства: что человек ищет, серьёзность, отношение к детям.
// В базе хранится короткий код; подписи и «короткие» варианты — тут.
// short — гендерно-нейтральные, показываются на чужих карточках.

export const GOAL = [
  { code: 'friendship', label: 'Дружба и общение', short: 'Дружба' },
  { code: 'dating', label: 'Свидания', short: 'Свидания' },
  { code: 'relationship', label: 'Отношения', short: 'Отношения' },
];

export const INTENT = [
  { code: 'serious', label: 'Всё серьёзно', short: 'Настрой серьёзный' },
  { code: 'casual', label: 'Пока без обязательств', short: 'Без обязательств' },
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
    ...INTENT.map((o) => [`intent:${o.code}`, o]),
    ...KIDS.map((o) => [`kids:${o.code}`, o]),
  ]
);

export const goalShort = (code) => BY_CODE[`goal:${code}`]?.short;
export const intentShort = (code) => BY_CODE[`intent:${code}`]?.short;
export const kidsShort = (code) => BY_CODE[`kids:${code}`]?.short;
