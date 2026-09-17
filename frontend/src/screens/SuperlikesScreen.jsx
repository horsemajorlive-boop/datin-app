import VerifiedBadge from '../components/VerifiedBadge';
import EmptyState from '../components/EmptyState';
import { IconX, IconHeartTriple } from '../components/icons';
import { cityWithDistance } from '../lib/location';

// Вкладка "Суперлайки" внутри чата — кто суперлайкнул вас и, может быть,
// оставил сообщение. В отличие от "Симпатий" доступно ВСЕМ без Premium:
// ответить взаимностью можно прямо здесь кнопкой "Взаимно" — сразу мэтч,
// без дневного лимита лайков (см. respondToSuperlike на сервере).
//
// Props:
//   people        — [{ ...profile, superlikeMessage, superlikeAt }] (GET /api/superlikes/incoming)
//   busyId        — id анкеты, для которой сейчас идёт запрос (кнопки блокируются)
//   onReciprocate — ответить взаимностью: onReciprocate(profile)
//   onPass        — пропустить: onPass(profile)
//   onBrowse      — уйти на вкладку «Поиск»

export default function SuperlikesScreen({ people, busyId, onReciprocate, onPass, onBrowse }) {
  if (people.length === 0) {
    return (
      <EmptyState
        icon={<IconHeartTriple filled />}
        title="Пока никто не суперлайкнул"
        text="Суперлайк — заметная симпатия с сообщением. Как только кто-то отправит его вам, он появится здесь."
        actionLabel="Листать анкеты"
        onAction={onBrowse}
      />
    );
  }

  return (
    <div className="superlikes">
      {people.map((p) => (
        <article className="superlike-card" key={p.id}>
          <div className="superlike-card__top">
            <div className="superlike-card__photo">
              <img src={p.photos[0]} alt={p.name} />
            </div>
            <div className="superlike-card__info">
              <span className="likecard__name">
                {p.name}, {p.age}
                {p.verified && <VerifiedBadge />}
              </span>
              {(p.city || p.distanceKm != null) && (
                <span className="likecard__city">{cityWithDistance(p.city, p.distanceKm)}</span>
              )}
            </div>
            <button
              type="button"
              className="superlike-card__pass"
              onClick={() => onPass(p)}
              disabled={busyId === p.id}
              aria-label="Пропустить"
            >
              <IconX />
            </button>
          </div>

          {p.superlikeMessage && <p className="superlike-card__msg">«{p.superlikeMessage}»</p>}

          <button
            type="button"
            className="superlike-card__mutual"
            onClick={() => onReciprocate(p)}
            disabled={busyId === p.id}
          >
            <IconHeartTriple filled />
            {busyId === p.id ? 'Отвечаем…' : 'Взаимно — ответить симпатией'}
          </button>
        </article>
      ))}
    </div>
  );
}
