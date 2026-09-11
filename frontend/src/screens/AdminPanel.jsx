import { useEffect, useState } from 'react';
import { api } from '../api';
import AdminUsers from './AdminUsers';
import AdminVerifications from './AdminVerifications';
import AdminReports from './AdminReports';
import { IconChevronLeft } from '../components/icons';

// Отдельный режим приложения — открывается секретным жестом на сердечке
// приветственного экрана (см. AdminGate). Здесь нет знакомств вообще:
// только модерация. Настоящий доступ по-прежнему проверяет сервер —
// секрет лишь открывает эту дверь, а не выдаёт права.
//
// Props:
//   onExit — вернуться к обычному входу в приложение

const TABS = [
  { id: 'users', label: 'Анкеты' },
  { id: 'verifications', label: 'Верификации' },
  { id: 'reports', label: 'Жалобы' },
];

export default function AdminPanel({ onExit }) {
  const [allowed, setAllowed] = useState(null); // null = проверяем
  const [tab, setTab] = useState('users');

  useEffect(() => {
    let alive = true;
    api
      .get('/me')
      .then((me) => alive && setAllowed(!!me.isAdmin))
      .catch(() => alive && setAllowed(false));
    return () => {
      alive = false;
    };
  }, []);

  if (allowed === null) {
    return (
      <div className="screen">
        <p className="muted">Проверяем права…</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="screen">
        <h1 className="screen__title">Нет доступа</h1>
        <p className="muted">
          Секретный жест угадан, но этот Telegram-аккаунт не отмечен
          администратором на сервере — так и должно быть, если это не вы.
        </p>
        <button className="btn-wide" onClick={onExit}>
          Назад ко входу
        </button>
      </div>
    );
  }

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
        {tab === 'users' && <AdminUsers />}
        {tab === 'verifications' && (
          <AdminVerifications onBack={() => setTab('users')} />
        )}
        {tab === 'reports' && <AdminReports onBack={() => setTab('users')} />}
      </div>
    </div>
  );
}
