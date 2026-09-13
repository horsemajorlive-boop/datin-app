import VerifiedBadge from '../components/VerifiedBadge';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { IconX, IconHeart } from '../components/icons';
import { cityWithDistance } from '../lib/location';

// Экран "Симпатии" — кто лайкнул ВАС и ждёт ответа.
// Лайк в ответ = мгновенный мэтч; «пропустить» убирает человека из списка.
//
// Props:
//   people   — массив анкет (GET /api/likes/incoming)
//   onLike   — ответить взаимностью: onLike(profile)
//   onPass   — отклонить: onPass(profile)
//   onBrowse — уйти на вкладку «Поиск»

export default function LikesScreen({ people, onLike, onPass, onBrowse }) {
  if (people.length === 0) {
    return (
      <div className="screen">
        <ScreenHeader title="Симпатии" />
        <EmptyState
          icon={<IconHeart filled />}
          title="Пока никто не лайкнул"
          text="Как только кто-то отметит вашу анкету, он появится здесь. Листайте анкеты — так вас увидит больше людей."
          actionLabel="Листать анкеты"
          onAction={onBrowse}
        />
      </div>
    );
  }

  return (
    <div className="screen">
      <ScreenHeader title="Симпатии" count={people.length} />
      <p className="likes__lead">
        Эти люди уже лайкнули вас. Ответьте взаимностью — сразу будет мэтч.
      </p>

      <div className="likes">
        {people.map((p) => (
          <article className="likecard" key={p.id}>
            <div className="likecard__photo">
              <img src={p.photos[0]} alt={p.name} />
            </div>
            <div className="likecard__info">
              <span className="likecard__name">
                {p.name}, {p.age}
                {p.verified && <VerifiedBadge />}
              </span>
              {(p.city || p.distanceKm != null) && (
                <span className="likecard__city">{cityWithDistance(p.city, p.distanceKm)}</span>
              )}
            </div>
            <div className="likecard__actions">
              <button
                type="button"
                className="likecard__btn likecard__btn--pass"
                onClick={() => onPass(p)}
                aria-label="Пропустить"
              >
                <IconX />
              </button>
              <button
                type="button"
                className="likecard__btn likecard__btn--like"
                onClick={() => onLike(p)}
                aria-label="Лайк в ответ"
              >
                <IconHeart filled />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
