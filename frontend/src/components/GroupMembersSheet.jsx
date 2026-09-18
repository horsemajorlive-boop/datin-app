import { useState } from 'react';
import VerifiedBadge from './VerifiedBadge';
import { IconX } from './icons';

// Шторка "Участники" — открывается тапом по шапке группового чата.
// Показывает состав группы; владельцу — кнопку исключения у каждого
// (кроме себя) и удаление группы целиком; остальным — выход из группы.
//
// Props:
//   group          — { id, name, description, city, interest, memberCount, isOwner, members }
//   busy           — идёт запрос (кик/выход/удаление) — блокирует кнопки
//   error          — текст последней ошибки, если была
//   onClose        — закрыть без действия
//   onKick         — onKick(userId)
//   onLeave        — покинуть группу (только не-владелец)
//   onDeleteGroup  — удалить группу целиком (только владелец)

export default function GroupMembersSheet({
  group,
  busy,
  error,
  onClose,
  onKick,
  onLeave,
  onDeleteGroup,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="sheet" onClick={() => !busy && onClose()}>
      <div className="sheet__card" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__body">
          <div className="filtersheet__head">
            <h2>{group.name}</h2>
            <button className="filtersheet__close" onClick={onClose} aria-label="Закрыть">
              <IconX />
            </button>
          </div>
          <p className="muted">
            {group.city}
            {group.interest ? ` · ${group.interest}` : ''}
          </p>
          {group.description && <p className="muted grpmembers__desc">{group.description}</p>}

          <h3 className="form__section-head">Участники · {group.memberCount}</h3>
          <div className="grpmembers">
            {group.members.map((m) => (
              <div className="grpmembers__row" key={m.id}>
                <img className="grpmembers__ava" src={m.photos[0]} alt={m.name} />
                <span className="grpmembers__name">
                  {m.name}
                  {m.verified && <VerifiedBadge />}
                  {m.role === 'owner' && <span className="grpmembers__owner">создатель</span>}
                </span>
                {group.isOwner && m.role !== 'owner' && (
                  <button
                    type="button"
                    className="grpmembers__kick"
                    disabled={busy}
                    onClick={() => onKick(m.id)}
                  >
                    Исключить
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && <p className="form__error">{error}</p>}

          {group.isOwner ? (
            confirmDelete ? (
              <>
                <p className="muted">Группа и вся переписка удалятся безвозвратно.</p>
                <button
                  type="button"
                  className="btn-wide btn-wide--danger-solid"
                  disabled={busy}
                  onClick={onDeleteGroup}
                >
                  {busy ? 'Удаляем…' : 'Да, удалить группу'}
                </button>
                <button
                  type="button"
                  className="btn-wide btn-wide--ghost"
                  disabled={busy}
                  onClick={() => setConfirmDelete(false)}
                >
                  Отмена
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-wide btn-wide--danger-solid"
                onClick={() => setConfirmDelete(true)}
              >
                Удалить группу
              </button>
            )
          ) : (
            <button
              type="button"
              className="btn-wide btn-wide--danger-solid"
              disabled={busy}
              onClick={onLeave}
            >
              {busy ? 'Выходим…' : 'Покинуть группу'}
            </button>
          )}
          <button type="button" className="btn-wide btn-wide--ghost" disabled={busy} onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
