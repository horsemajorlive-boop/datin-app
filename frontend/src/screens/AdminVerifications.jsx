import { useCallback, useEffect, useState } from 'react';
import { api, assetUrl } from '../api';
import { IconChevronLeft } from '../components/icons';

// Очередь модерации верификаций (только для админа).
// Для каждой заявки показываем публичные фото анкеты и присланное селфи,
// админ сравнивает и жмёт "Подтвердить" / "Отклонить".
//
// Props:
//   onBack — вернуться в профиль

export default function AdminVerifications({ onBack }) {
  const [list, setList] = useState(null); // null = грузится
  const [busy, setBusy] = useState(null); // userId, по которому идёт запрос

  const load = useCallback(async () => {
    setList(await api.get('/admin/verifications'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function review(userId, decision) {
    setBusy(userId);
    try {
      await api.post(`/admin/verifications/${userId}/review`, { decision });
      setList((cur) => cur.filter((r) => r.userId !== userId));
    } catch {
      /* оставим в списке, попробует ещё раз */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="screen">
      <button className="onb__back verify-back" onClick={onBack} aria-label="Назад">
        <IconChevronLeft />
      </button>
      <h1 className="screen__title">Модерация верификаций</h1>

      {list == null && <p className="muted">Загрузка…</p>}
      {list != null && list.length === 0 && (
        <p className="muted">Очередь пуста.</p>
      )}

      {list?.map((r) => (
        <VerificationCard
          key={r.userId}
          req={r}
          busy={busy === r.userId}
          onReview={review}
        />
      ))}
    </div>
  );
}

function VerificationCard({ req, busy, onReview }) {
  const [selfie, setSelfie] = useState(null);

  // Селфи лежит в приватной папке — тянем его с авторизацией как Blob.
  useEffect(() => {
    let url;
    let alive = true;
    api
      .getBlob(`/admin/verifications/${req.userId}/photo`)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setSelfie(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [req.userId]);

  return (
    <div className="modcard">
      <div className="modcard__head">
        <b>
          {req.name}, {req.age}
        </b>
        {req.city && <span className="muted"> · {req.city}</span>}
      </div>

      <div className="modcard__pose">
        Заданная поза: <b>{req.pose || '—'}</b>
      </div>

      <div className="modcard__photos">
        <div className="modcard__col">
          <span className="modcard__cap">Селфи</span>
          {selfie ? (
            <img src={selfie} alt="Селфи" />
          ) : (
            <div className="modcard__ph" />
          )}
        </div>
        <div className="modcard__col">
          <span className="modcard__cap">Фото анкеты</span>
          <div className="modcard__strip">
            {req.photos.map((p, i) => (
              <img key={i} src={assetUrl(p)} alt={`Фото ${i + 1}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="modcard__actions">
        <button
          className="btn-wide btn-wide--ghost"
          disabled={busy}
          onClick={() => onReview(req.userId, 'reject')}
        >
          Отклонить
        </button>
        <button
          className="btn-wide"
          disabled={busy}
          onClick={() => onReview(req.userId, 'approve')}
        >
          Подтвердить
        </button>
      </div>
    </div>
  );
}
