import { useState } from 'react';
import AdminVerifications from './AdminVerifications';
import AdminReports from './AdminReports';
import { IconChevronLeft } from '../components/icons';

// Отдельный режим приложения — открывается секретным жестом на сердечке
// приветственного экрана (см. AdminGate, там же — тихая проверка прав).
// Здесь нет знакомств и намеренно нет доступа к чужим анкетам и перепискам
// целиком: только очереди верификаций и жалоб, которые и так требуют
// действия от живого человека и не дают всё удалить одним махом.
//
// Props:
//   onExit — вернуться к обычному входу в приложение

const TABS = [
  { id: 'verifications', label: 'Верификации' },
  { id: 'reports', label: 'Жалобы' },
];

export default function AdminPanel({ onExit }) {
  const [tab, setTab] = useState('verifications');

  return (
    <div className="adm-shell">
      <header className="adm-shell__head">
        <button
          className="onb__back verify-back adm-shell__exit"
          onClick={onExit}
          aria-label="Выйти из режима админа"
        >
          <IconChevronLeft />
        </button>
        <span className="adm-shell__title">Режим администратора</span>
      </header>

      <div className="adm-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`adm-tabs__btn ${tab === t.id ? 'is-on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="adm-shell__body">
        {tab === 'verifications' && (
          <AdminVerifications onBack={() => setTab('verifications')} />
        )}
        {tab === 'reports' && (
          <AdminReports onBack={() => setTab('verifications')} />
        )}
      </div>
    </div>
  );
}
