// Поля "здоровья": рост, вес, курение, алкоголь.

export const HEIGHT_RANGE = { min: 140, max: 210, default: 175 };
export const WEIGHT_RANGE = { min: 40, max: 150, default: 65 };

export const SMOKING = [
  { code: 'no', label: 'Не курю', short: 'Не курю' },
  { code: 'sometimes', label: 'Иногда курю', short: 'Иногда курит' },
  { code: 'yes', label: 'Курю', short: 'Курит' },
];

export const DRINKING = [
  { code: 'no', label: 'Не пью', short: 'Не пьёт' },
  { code: 'sometimes', label: 'Пью по случаю', short: 'Иногда' },
  { code: 'yes', label: 'Пью регулярно', short: 'Пьёт' },
];

const BY_CODE = Object.fromEntries(
  [
    ...SMOKING.map((o) => [`smoking:${o.code}`, o]),
    ...DRINKING.map((o) => [`drinking:${o.code}`, o]),
  ]
);

export const smokingLabel = (code) => BY_CODE[`smoking:${code}`]?.short;
export const drinkingLabel = (code) => BY_CODE[`drinking:${code}`]?.short;
