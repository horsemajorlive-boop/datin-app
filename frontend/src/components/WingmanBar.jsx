// Панель подсказок ИИ-помощника над полем ввода.
//
// Props:
//   suggestions — массив строк-подсказок
//   onPick      — нажали на подсказку: onPick(text) (обычно — подставить в поле ввода)

export default function WingmanBar({ suggestions, onPick }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="wingman">
      <span className="wingman__label">✨ Подсказки для диалога</span>
      <div className="wingman__list">
        {suggestions.map((text, i) => (
          <button
            className="wingman__chip"
            key={i}
            type="button"
            onClick={() => onPick(text)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
