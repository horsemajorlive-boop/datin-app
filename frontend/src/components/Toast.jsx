// Плавающее уведомление об ошибке — для действий без своего экрана/шторки
// (свайп в колоде, ответ "Взаимно" на суперлайк, отправка фото в чате), где
// раньше сбой сети просто молча уходил в console.error. Сама очередь из
// одного сообщения и автоскрытие — см. showToast в App.jsx.
//
// Props:
//   text      — текст ошибки (пусто/null — ничего не рисуем)
//   onDismiss — скрыть раньше времени (тап по уведомлению)

export default function Toast({ text, onDismiss }) {
  if (!text) return null;

  return (
    <div className="toast" onClick={onDismiss} role="alert">
      {text}
    </div>
  );
}
