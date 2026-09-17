import { useState } from 'react';
import { IconHeartTriple } from './icons';

// Шторка "Суперлайк" — открывается по свайпу карточки вверх или по кнопке.
// Сообщение необязательно: можно просто отправить суперлайк пустым. После
// подтверждения карточка улетает как обычный лайк — отдельного состояния
// "отправляем" тут не нужно.
//
// Props:
//   profile   — анкета, которой отправляем суперлайк (для имени в шапке)
//   onCancel  — закрыть без отправки (карточка уже спружинила обратно)
//   onConfirm — onConfirm(message) — отправить суперлайк

const MESSAGE_MAX_LEN = 200;

export default function SuperlikeComposer({ profile, onCancel, onConfirm }) {
  const [message, setMessage] = useState('');

  return (
    <div className="sheet" onClick={onCancel}>
      <div className="sheet__card superlike-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__body">
          <div className="superlike-sheet__head">
            <span className="superlike-sheet__icon">
              <IconHeartTriple filled />
            </span>
            <h2>Суперлайк для {profile.name}</h2>
          </div>
          <p className="muted">
            Суперлайк — приоритетная симпатия: {profile.name} увидит его первым в отдельной
            вкладке «Суперлайки» вместе с вашим сообщением (необязательно).
          </p>

          <textarea
            className="report__note"
            rows={3}
            maxLength={MESSAGE_MAX_LEN}
            placeholder="Пара слов вместо тысячи свайпов… (необязательно)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            autoFocus
          />

          <button
            type="button"
            className="btn-wide superlike-sheet__send"
            onClick={() => onConfirm(message.trim())}
          >
            Отправить суперлайк
          </button>
          <button type="button" className="btn-wide btn-wide--ghost" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
