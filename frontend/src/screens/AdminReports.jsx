import { useCallback, useEffect, useState } from 'react';
import { api, assetUrl } from '../api';
import { reasonLabel } from '../data/reportReasons';
import { IconChevronLeft } from '../components/icons';

// Очередь жалоб (только админ). Показываем, на кого пожаловались, причину и
// фото анкеты. Действия: скрыть анкету из поиска / пометить разобранной.
//
// Props:
//   onBack — вернуться в профиль

export default function AdminReports({ onBack }) {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(null); // id жалобы в работе

  const load = useCallback(async () => {
    setList(await api.get('/admin/reports'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function hide(report) {
    setBusy(report.id);
    try {
      await api.post('/admin/hide-profile', { userId: report.reportedId });
      await api.post(`/admin/reports/${report.id}/review`);
      setList((cur) => cur.filter((r) => r.id !== report.id));
    } catch {
      /* оставим в списке */
    } finally {
      setBusy(null);
    }
  }

  async function dismiss(report) {
    setBusy(report.id);
    try {
      await api.post(`/admin/reports/${report.id}/review`);
      setList((cur) => cur.filter((r) => r.id !== report.id));
    } catch {
      /* оставим в списке */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="screen">
      <button className="onb__back verify-back" onClick={onBack} aria-label="Назад">
        <IconChevronLeft />
      </button>
      <h1 className="screen__title">Жалобы</h1>

      {list == null && <p className="muted">Загрузка…</p>}
      {list != null && list.length === 0 && <p className="muted">Жалоб нет.</p>}

      {list?.map((r) => (
        <div className="modcard" key={r.id}>
          <div className="modcard__head">
            <b>{r.reportedName}</b>
            <span className="muted"> · {reasonLabel(r.reason)}</span>
          </div>
          <div className="modcard__pose">
            От: {r.reporterName}
            {r.note ? ` — «${r.note}»` : ''}
          </div>

          {r.reportedPhotos.length > 0 && (
            <div className="modcard__strip">
              {r.reportedPhotos.map((p, i) => (
                <img key={i} src={assetUrl(p)} alt={`Фото ${i + 1}`} />
              ))}
            </div>
          )}

          <div className="modcard__actions">
            <button
              className="btn-wide btn-wide--ghost"
              disabled={busy === r.id}
              onClick={() => dismiss(r)}
            >
              Ничего не делать
            </button>
            <button
              className="btn-wide btn-wide--danger-solid"
              disabled={busy === r.id}
              onClick={() => hide(r)}
            >
              Скрыть анкету
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
