// Каталог интересов с эмодзи.
// В анкете интересы хранятся как обычные строки ('Кофе', 'Горы'…),
// а эмодзи подбираем по названию через interestEmoji().

export const INTEREST_OPTIONS = [
  { label: 'Путешествия', emoji: '✈️' },
  { label: 'Музыка', emoji: '🎵' },
  { label: 'Кино', emoji: '🎬' },
  { label: 'Спорт', emoji: '🏋️' },
  { label: 'Кофе', emoji: '☕' },
  { label: 'Книги', emoji: '📚' },
  { label: 'Готовка', emoji: '🍳' },
  { label: 'Горы', emoji: '⛰️' },
  { label: 'Море', emoji: '🌊' },
  { label: 'Фотография', emoji: '📷' },
  { label: 'Настолки', emoji: '🎲' },
  { label: 'Йога', emoji: '🧘' },
  { label: 'Кошки', emoji: '🐈' },
  { label: 'Собаки', emoji: '🐕' },
  { label: 'Танцы', emoji: '💃' },
  { label: 'Искусство', emoji: '🎨' },
  { label: 'Технологии', emoji: '💻' },
  { label: 'Бег', emoji: '🏃' },
  { label: 'Велоспорт', emoji: '🚴' },
  { label: 'Вино', emoji: '🍷' },
  { label: 'Природа', emoji: '🌿' },
  { label: 'Игры', emoji: '🎮' },
  { label: 'Мода', emoji: '👗' },
  { label: 'Кофейни', emoji: '🥐' },
];

// Словарь "название в нижнем регистре -> эмодзи" — строим один раз при загрузке модуля.
const EMOJI_BY_LABEL = Object.fromEntries(
  INTEREST_OPTIONS.map((option) => [option.label.toLowerCase(), option.emoji])
);

// Возвращает эмодзи для интереса. Для своих вариантов, которых нет в каталоге, — звёздочка.
export function interestEmoji(label) {
  return EMOJI_BY_LABEL[String(label).toLowerCase()] ?? '✨';
}
