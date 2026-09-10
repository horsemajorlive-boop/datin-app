import { useState } from 'react';
import { api } from '../api';
import { REPORT_REASONS } from '../data/reportReasons';

// Шторка "Пожаловаться / заблокировать". Обе кнопки блокируют пользователя.
//
// Props:
//   user   — { id, name } — на кого жалуемся
//   onClose — закрыть без действия
//   onDone  — вызвать после успешной жалобы или блокировки

export default function ReportSheet({ user, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submitReport() {
    if (!reason) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/report', { userId: user.id, reason, note: note.trim() });
      onDone();
    } catch (err) {
      setError(err.message || 'Не удалось отправить');
      setBusy(false);
    }
  }

  async function justBlock() {
    setBusy(true);
    setError('');
    try {
      await api.post('/block', { userId: user.id });
      onDone();
    } catch (err) {
      setError(err.message || 'Не удалось заблокировать');
      setBusy(false);
    }
  }

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__card" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__body">
          <h2>Пожаловаться</h2>
          <p className="muted report__hint">
            {user.name} пропадёт из ленты, мэтчей и чата. Жалобу проверит модератор.
          </p>

          <div className="choice report__reasons">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.code}
                type="button"
                className={`chipbtn ${reason === r.code ? 'is-on' : ''}`}
                onClick={() => setReason(r.code)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <textarea
            className="report__note"
            rows={3}
            maxLength={500}
            placeholder="Что случилось? (необязательно)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {error && <p className="form__error">{error}</p>}

          <button
            className="btn-wide btn-wide--danger-solid"
            disabled={!reason || busy}
            onClick={submitReport}
          >
            {busy ? 'Отправляем…' : 'Отправить жалобу'}
          </button>
          <button
            className="btn-wide btn-wide--ghost"
            disabled={busy}
            onClick={justBlock}
          >
            Просто заблокировать
          </button>
          <button className="btn-wide btn-wide--ghost" disabled={busy} onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
