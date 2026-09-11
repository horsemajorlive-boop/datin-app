import { useCallback, useEffect, useRef, useState } from 'react';
import { api, assetUrl, normalizeMessage } from '../api';
import VerifiedBadge from '../components/VerifiedBadge';
import { IconChevronLeft } from '../components/icons';

// "Все анкеты" — полный список пользователей с поиском, плюс точечные
// действия без нужды в чьей-то жалобе: показать/скрыть из поиска, выдать
// или снять галочку, посмотреть переписки, удалить аккаунт целиком.
//
// Экран сам переключается между четырьмя видами:
//   list   — список + поиск + пагинация
//   detail — карточка одного пользователя и действия
//   chats  — его мэтчи (с кем переписывается)
//   thread — сырая переписка одного мэтча (только чтение)
//
// Props:
//   onBack — вернуться в меню админ-панели

const PAGE_SIZE = 20;

function formatTime(ts) {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`switch ${checked ? 'is-on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__knob" />
    </button>
  );
}

export default function AdminUsers({ onBack }) {
  const [view, setView] = useState('list');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [matches, setMatches] = useState(null);
  const [activeMatch, setActiveMatch] = useState(null);
  const [messages, setMessages] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef(null);

  const load = useCallback(async (q, offset) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
      if (q) params.set('q', q);
      const res = await api.get(`/admin/users?${params}`);
      setTotal(res.total);
      setItems((cur) => (offset === 0 ? res.items : [...cur, ...res.items]));
    } finally {
      setLoading(false);
    }
  }, []);

  // Первая загрузка + повторная при вводе в поиск (с небольшой задержкой).
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(query, 0), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, load]);

  function openUser(u) {
    setSelected(u);
    setConfirmDelete(false);
    setView('detail');
  }

  async function toggleVisibility(next) {
    setBusy(true);
    try {
      await api.post(`/admin/users/${selected.id}/visibility`, { visible: next });
      setSelected((s) => ({ ...s, isVisible: next }));
      setItems((cur) =>
        cur.map((u) => (u.id === selected.id ? { ...u, isVisible: next } : u))
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleVerified(next) {
    setBusy(true);
    try {
      await api.post(`/admin/users/${selected.id}/verified`, { verified: next });
      setSelected((s) => ({ ...s, verified: next }));
      setItems((cur) =>
        cur.map((u) => (u.id === selected.id ? { ...u, verified: next } : u))
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser() {
    setBusy(true);
    try {
      await api.del(`/admin/users/${selected.id}`);
      setItems((cur) => cur.filter((u) => u.id !== selected.id));
      setTotal((t) => Math.max(0, t - 1));
      setView('list');
      setSelected(null);
    } catch (err) {
      alert(err.message || 'Не получилось удалить');
    } finally {
      setBusy(false);
    }
  }

  async function openChats() {
    setView('chats');
    setMatches(null);
    setMatches(await api.get(`/admin/users/${selected.id}/matches`));
  }

  async function openThread(m) {
    setActiveMatch(m);
    setView('thread');
    setMessages(null);
    const list = await api.get(`/admin/matches/${m.matchId}/messages`);
    setMessages(list.map(normalizeMessage));
  }

  // ---------- список ----------

  if (view === 'list') {
    return (
      <div className="screen">
        {onBack && (
          <button
            className="onb__back verify-back"
            onClick={onBack}
            aria-label="Назад"
          >
            <IconChevronLeft />
          </button>
        )}
        <h1 className="screen__title">Все анкеты · {total}</h1>

        <div className="field adm__search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени или id"
          />
        </div>

        <div className="matchlist">
          {items.map((u) => (
            <button
              className="matchlist__item"
              key={u.id}
              onClick={() => openUser(u)}
            >
              <span className="matchlist__ava">
                {u.photo ? (
                  <img src={assetUrl(u.photo)} alt={u.name || String(u.id)} />
                ) : (
                  <span className="adm__noph" />
                )}
              </span>
              <div className="matchlist__info">
                <span className="matchlist__name">
                  {u.name || `id ${u.id}`}
                  {u.age ? `, ${u.age}` : ''}
                  {u.verified && <VerifiedBadge />}
                  {u.isAdmin && <span className="adm__tag">админ</span>}
                </span>
                <span className="matchlist__hint">
                  {u.city || '—'}
                  {!u.isVisible && ' · скрыт из поиска'}
                </span>
              </div>
              {u.openReports > 0 && (
                <span className="matchlist__badge matchlist__badge--count">
                  {u.openReports}
                </span>
              )}
            </button>
          ))}
        </div>

        {!loading && items.length === 0 && (
          <p className="muted">Никого не нашлось.</p>
        )}

        {items.length < total && (
          <button
            type="button"
            className="btn-wide btn-wide--ghost"
            disabled={loading}
            onClick={() => load(query, items.length)}
          >
            {loading ? 'Загружаем…' : 'Показать ещё'}
          </button>
        )}
      </div>
    );
  }

  // ---------- карточка пользователя ----------

  if (view === 'detail' && selected) {
    return (
      <div className="screen">
        <button
          className="onb__back verify-back"
          onClick={() => setView('list')}
          aria-label="Назад"
        >
          <IconChevronLeft />
        </button>

        <div className="adm__detail-head">
          <span className="matchlist__ava adm__detail-ava">
            {selected.photo ? (
              <img src={assetUrl(selected.photo)} alt={selected.name} />
            ) : (
              <span className="adm__noph" />
            )}
          </span>
          <div>
            <h2 className="adm__detail-name">
              {selected.name || `id ${selected.id}`}
              {selected.age ? `, ${selected.age}` : ''}
              {selected.verified && <VerifiedBadge />}
            </h2>
            <p className="muted">
              id {selected.id}
              {selected.city ? ` · ${selected.city}` : ''}
            </p>
          </div>
        </div>

        {selected.openReports > 0 && (
          <p className="adm__reports-note">
            На эту анкету открытых жалоб: {selected.openReports}
          </p>
        )}

        <div className="set-group">
          <div className="set-row">
            <span className="set-row__text">Показывать в поиске</span>
            <Switch
              checked={selected.isVisible}
              disabled={busy}
              onChange={toggleVisibility}
            />
          </div>
          <div className="set-row">
            <span className="set-row__text">Галочка верификации</span>
            <Switch
              checked={selected.verified}
              disabled={busy}
              onChange={toggleVerified}
            />
          </div>
          <button type="button" className="set-row set-row--btn" onClick={openChats}>
            <span className="set-row__text">Переписки</span>
            <span className="set-row__chev">›</span>
          </button>
        </div>

        <div className="set-group">
          <div className="set-group__head set-group__head--danger">
            Опасная зона
          </div>
          {!confirmDelete ? (
            <button
              type="button"
              className="btn-wide btn-wide--ghost btn-wide--danger"
              onClick={() => setConfirmDelete(true)}
            >
              Удалить аккаунт
            </button>
          ) : (
            <div className="set-confirm">
              <p>Аккаунт, анкета, фото, мэтчи и переписка удалятся безвозвратно.</p>
              <div className="form__actions">
                <button
                  type="button"
                  className="btn-wide btn-wide--ghost"
                  disabled={busy}
                  onClick={() => setConfirmDelete(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="btn-wide btn-wide--danger-solid"
                  disabled={busy}
                  onClick={deleteUser}
                >
                  {busy ? 'Удаляем…' : 'Удалить навсегда'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- мэтчи пользователя ----------

  if (view === 'chats' && selected) {
    return (
      <div className="screen">
        <button
          className="onb__back verify-back"
          onClick={() => setView('detail')}
          aria-label="Назад"
        >
          <IconChevronLeft />
        </button>
        <h1 className="screen__title">Переписки — {selected.name || selected.id}</h1>

        {matches == null && <p className="muted">Загрузка…</p>}
        {matches != null && matches.length === 0 && (
          <p className="muted">У этого пользователя пока нет мэтчей.</p>
        )}

        <div className="matchlist">
          {matches?.map((m) => (
            <button
              className="matchlist__item"
              key={m.matchId}
              onClick={() => openThread(m)}
            >
              <span className="matchlist__ava">
                <img src={assetUrl(m.profile.photos[0])} alt={m.profile.name} />
              </span>
              <div className="matchlist__info">
                <span className="matchlist__name">
                  {m.profile.name}, {m.profile.age}
                </span>
                <span className="matchlist__hint">
                  {m.lastMessage
                    ? m.lastMessage.type === 'photo'
                      ? 'Фотография'
                      : m.lastMessage.text
                    : 'Сообщений ещё нет'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- переписка (только чтение) ----------

  if (view === 'thread' && selected && activeMatch) {
    const otherId = activeMatch.profile.id;
    return (
      <div className="screen">
        <button
          className="onb__back verify-back"
          onClick={() => setView('chats')}
          aria-label="Назад"
        >
          <IconChevronLeft />
        </button>
        <h1 className="screen__title">
          {selected.name} ↔ {activeMatch.profile.name}
        </h1>

        <div className="chat__body adm__thread">
          {messages == null && <p className="muted">Загрузка…</p>}
          {messages != null && messages.length === 0 && (
            <p className="muted">Переписки ещё нет.</p>
          )}
          {messages?.map((m) => (
            <div
              key={m.id}
              className={
                'chat__msg ' +
                (m.senderId === otherId ? 'chat__msg--them' : 'chat__msg--me') +
                (m.type && m.type !== 'text' ? ' chat__msg--bare' : '')
              }
            >
              {m.type === 'photo' ? (
                <img className="chat__photo" src={m.photo} alt="фото" />
              ) : (
                <span
                  className={m.type === 'emoji' ? 'chat__bigemoji' : 'chat__text'}
                >
                  {m.text}
                </span>
              )}
              <span className="chat__time">{formatTime(m.ts)}</span>
              {m.reaction && <span className="chat__reaction">{m.reaction}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
