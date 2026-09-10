import { goalShort, kidsShort } from '../data/goals';
import { IconHeart } from './icons';

// Цель на сайте и отношение к детям чипами.
//
// Props:
//   profile — анкета (goal, kids)

export default function GoalChips({ profile }) {
  if (!profile) return null;

  const chips = [goalShort(profile.goal), kidsShort(profile.kids)].filter(
    Boolean
  );

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
