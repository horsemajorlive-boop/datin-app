import { goalShort, intentShort, kidsShort } from '../data/goals';
import { IconHeart } from './icons';

// Цели знакомства чипами: что ищет, серьёзность, дети.
//
// Props:
//   profile — анкета (goal, intent, kids)

export default function GoalChips({ profile }) {
  if (!profile) return null;

  const chips = [
    goalShort(profile.goal),
    intentShort(profile.intent),
    kidsShort(profile.kids),
  ].filter(Boolean);

  if (chips.length === 0) return null;

  return (
    <div className="ichips">
      {chips.map((text, i) => (
        <span className={`ichip ${i === 0 ? 'ichip--goal' : ''}`} key={text}>
          {i === 0 && <IconHeart />}
          {text}
        </span>
      ))}
    </div>
  );
}
