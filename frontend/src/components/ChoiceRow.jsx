// Ряд вариантов "выбери один или ничего" (жильё, авто, работа в редакторе).
//
// Props:
//   label    — подпись поля
//   options  — [{ code, label }]
//   value    — текущий код ('' если не выбрано)
//   onChange — onChange(код | '')

export default function ChoiceRow({ label, options, value, onChange }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="choice">
        {options.map((opt) => (
          <button
            key={opt.code}
            type="button"
            className={`chipbtn ${value === opt.code ? 'is-on' : ''}`}
            onClick={() => onChange(value === opt.code ? '' : opt.code)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
