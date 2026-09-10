// Ползунок с числовым значением (рост / вес). Значение необязательное:
// пока не указано — показываем кнопку "Указать …".
//
// Props:
//   label        — подпись
//   unit         — единица ('см', 'кг')
//   min, max     — границы
//   defaultValue — куда встать при первом включении
//   value        — число или null
//   onChange     — onChange(число | null)

export default function RangeRow({
  label,
  unit,
  min,
  max,
  defaultValue,
  value,
  onChange,
}) {
  if (value == null) {
    return (
      <div className="field">
        <span>{label}</span>
        <button
          type="button"
          className="btn-wide btn-wide--ghost"
          onClick={() => onChange(defaultValue)}
        >
          Указать {label.toLowerCase()}
        </button>
      </div>
    );
  }

  return (
    <div className="field">
      <span>{label}</span>
      <div className="range">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="range__val">
          {value} {unit}
        </span>
        <button
          type="button"
          className="range__clear"
          aria-label="Убрать"
          onClick={() => onChange(null)}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
