import { interestIconKey } from '../data/interests';
import { InterestIcon } from './interestIcons';

// Отображение интересов чипами: линейная иконка раздела + название.
//
// Props:
//   interests — массив строк
//   limit     — необяз.: показать не больше N, остальные свернуть в "+3"

export default function InterestChips({ interests, limit }) {
  if (!interests || interests.length === 0) return null;

  const shown = limit ? interests.slice(0, limit) : interests;
  const hidden = limit ? interests.length - shown.length : 0;

  return (
    <div className="ichips">
      {shown.map((name) => (
        <span className="ichip" key={name}>
          <InterestIcon iconKey={interestIconKey(name)} />
          {name}
        </span>
      ))}
      {hidden > 0 && <span className="ichip ichip--more">+{hidden}</span>}
    </div>
  );
}
