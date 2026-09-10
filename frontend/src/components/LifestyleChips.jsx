import { LIFESTYLE_BY_CODE } from '../data/lifestyle';
import { IconHome, IconCar, IconBriefcase } from './icons';

// Показывает заполненные поля образа жизни (жильё / авто / работа) чипами
// с чистыми линейными иконками — без эмодзи.
//
// Props:
//   profile — анкета (profile.housing / profile.car / profile.employment)
//   short   — короткие подписи (для карточки в колоде)

const FIELDS = [
  { key: 'housing', Icon: IconHome },
  { key: 'car', Icon: IconCar },
  { key: 'employment', Icon: IconBriefcase },
];

export default function LifestyleChips({ profile, short = false }) {
  if (!profile) return null;

  const items = FIELDS.map(({ key, Icon }) => {
    const opt = LIFESTYLE_BY_CODE[profile[key]];
    return opt ? { opt, Icon } : null;
  }).filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="ichips">
      {items.map(({ opt, Icon }) => (
        <span className="ichip" key={opt.code}>
          <Icon />
          {short ? opt.short : opt.label}
        </span>
      ))}
    </div>
  );
}
