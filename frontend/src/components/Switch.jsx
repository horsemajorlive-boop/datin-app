// Простой переключатель вкл/выкл. Используется в настройках и в
// редактировании анкеты (видимость ников соцсетей).
export default function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`switch ${checked ? 'is-on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__knob" />
    </button>
  );
}
