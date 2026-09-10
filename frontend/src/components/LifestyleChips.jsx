import { LIFESTYLE_BY_CODE, LIFESTYLE_FIELDS } from '../data/lifestyle';

// Показывает заполненные поля образа жизни (жильё / авто / работа) чипами.
//
// Props:
//   profile — анкета (берём profile.housing / profile.car / profile.employment)
//   short   — короткие подписи (для карточки в колоде)

export default function LifestyleChips({ profile, short = false }) {
  if (!profile) return null;

  const items = LIFESTYLE_FIELDS.map((field) => LIFESTYLE_BY_CODE[profile[field]])
    .filter(Boolean); // оставляем только заполненные

  if (items.length === 0) return null;

  return (
    <div className="ichips">
      {items.map((opt) => (
        <span className="ichip" key={opt.code}>
          <span className="ichip__emoji">{opt.emoji}</span>
          {short ? opt.short : opt.label}
        </span>
      ))}
    </div>
  );
}
