// Единая шапка экрана-вкладки: заголовок слева (+ необязательный счётчик),
// одно место под действие справа.
//
// Props:
//   title    — заголовок
//   count    — число рядом с заголовком (необязательно)
//   children — что показать справа (обычно <button className="scrhead__btn">)

export default function ScreenHeader({ title, count, children }) {
  return (
    <header className="scrhead">
      <h1 className="scrhead__title">
        {title}
        {count != null && <span className="scrhead__count">{count}</span>}
      </h1>
      {children && <div className="scrhead__actions">{children}</div>}
    </header>
  );
}
