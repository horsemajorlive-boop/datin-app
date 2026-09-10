import { smokingLabel, drinkingLabel } from '../data/health';

// Показывает заполненные поля здоровья чипами: рост, вес, курение, алкоголь.
//
// Props:
//   profile — анкета (height, weight, smoking, drinking)

export default function HealthChips({ profile }) {
  if (!profile) return null;

  const chips = [];
  if (profile.height) chips.push(`${profile.height} см`);
  if (profile.weight) chips.push(`${profile.weight} кг`);
  if (profile.smoking) chips.push(smokingLabel(profile.smoking));
  if (profile.drinking) chips.push(drinkingLabel(profile.drinking));

  const items = chips.filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className="ichips">
      {items.map((text) => (
        <span className="ichip ichip--plain" key={text}>
          {text}
        </span>
      ))}
    </div>
  );
}
