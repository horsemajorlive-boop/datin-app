// Заглушка для пустого экрана: иконка в кружке, заголовок, пояснение
// и (необязательно) кнопка действия.
//
// Props:
//   icon        — JSX иконки, напр. <IconHeart />
//   title       — крупная строка
//   text        — пояснение под ней
//   actionLabel — подпись кнопки (если нужна)
//   onAction    — обработчик кнопки

export default function EmptyState({ icon, title, text, actionLabel, onAction }) {
  return (
    <div className="empty">
      {icon && <div className="empty__icon">{icon}</div>}
      <h2 className="empty__title">{title}</h2>
      {text && <p className="empty__text">{text}</p>}
      {actionLabel && onAction && (
        <button type="button" className="empty__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
