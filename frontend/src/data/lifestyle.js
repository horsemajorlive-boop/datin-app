// Поля "образа жизни": жильё, авто, работа.
// В анкете хранятся короткими кодами; здесь — как их показывать.

export const HOUSING = [
  { code: 'own', label: 'Своя квартира', short: 'Своя квартира', emoji: '🏠' },
  { code: 'rent', label: 'Снимаю жильё', short: 'Снимаю', emoji: '🔑' },
  { code: 'parents', label: 'Живу с родителями', short: 'С родителями', emoji: '👪' },
];

export const CAR = [
  { code: 'yes', label: 'Есть машина', short: 'Есть авто', emoji: '🚗' },
  { code: 'no', label: 'Без машины', short: 'Без авто', emoji: '🚶' },
];

export const EMPLOYMENT = [
  { code: 'working', label: 'Работаю', short: 'Работаю', emoji: '💼' },
  { code: 'not_working', label: 'Пока не работаю', short: 'Не работаю', emoji: '🌤️' },
];

// Быстрый поиск варианта по коду (коды между группами не пересекаются).
export const LIFESTYLE_BY_CODE = Object.fromEntries(
  [...HOUSING, ...CAR, ...EMPLOYMENT].map((o) => [o.code, o])
);

// Порядок, в котором показываем на анкете.
export const LIFESTYLE_FIELDS = ['housing', 'car', 'employment'];
