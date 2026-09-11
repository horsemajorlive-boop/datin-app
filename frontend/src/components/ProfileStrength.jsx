import { computeProfileStrength } from '../lib/profileStrength';

// Полоска "анкета заполнена на X%" + пара самых весомых подсказок, чего
// не хватает. Пропадает сама, как только анкета заполнена полностью.
//
// Props:
//   profile — анкета
//   onEdit  — открыть редактирование анкеты (тап по подсказке)

export default function ProfileStrength({ profile, onEdit }) {
  const { percent, missing } = computeProfileStrength(profile);
  if (percent >= 100) return null;

  const tips = missing.slice(0, 2);

  return (
    <div className="strength">
      <div className="strength__head">
        <span className="strength__title">Анкета заполнена на {percent}%</span>
      </div>
      <div className="strength__bar">
        <div className="strength__fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="strength__tips">
        {tips.map((item) => (
          <button
            key={item.key}
            type="button"
            className="strength__tip"
            onClick={onEdit}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
