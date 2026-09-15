import VerifiedBadge from '../components/VerifiedBadge';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { IconX, IconHeart, IconLock } from '../components/icons';
import { cityWithDistance } from '../lib/location';

// Склонение "человек" под число: 1 человек уже лайкнул, 2 человека уже
// лайкнули, 5 человек уже лайкнули — обычные русские правила (искл. 11–14).
function likersLine(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} человек уже лайкнул вас`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${n} человека уже лайкнули вас`;
  }
  return `${n} человек уже лайкнули вас`;
}

// Экран "Симпатии" — кто лайкнул ВАС и ждёт ответа.
// Лайк в ответ = мгновенный мэтч; «пропустить» убирает человека из списка.
//
// Без Premium личность лайкнувших скрыта: сервер (см. getIncomingLikes)
// отдаёт те же карточки, но без имени и деталей — только id/возраст/первое
// фото. Тут это превращаем в размытый тизер с призывом оформить Premium;
// count (people.length) при этом настоящий и виден всем — это и крючок.
//
// Props:
//   people    — массив анкет (GET /api/likes/incoming), возможно замаскированных
//   isPremium — есть ли Premium (открывает личности лайкнувших)
//   onLike    — ответить взаимностью: onLike(profile)
//   onPass    — отклонить: onPass(profile)
//   onBrowse  — уйти на вкладку «Поиск»
//   onUpgrade — перейти к оформлению Premium (настройки)

export default function LikesScreen({ people, isPremium, onLike, onPass, onBrowse, onUpgrade }) {
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

  if (!isPremium) {
    return (
      <div className="screen">
        <ScreenHeader title="Симпатии" count={people.length} />
        <div className="likes-locked">
          <div className="likes-locked__stack">
            {people.slice(0, 4).map((p) => (
              <img key={p.id} className="likes-locked__photo" src={p.photos[0]} alt="" />
            ))}
          </div>
          <p className="likes-locked__count">{likersLine(people.length)}</p>
          <h2 className="likes-locked__title">Хотите видеть, кому вы понравились?</h2>
          <p className="likes-locked__text">
            С TiAmo Premium возможно всё — не упустите свою возможность.
          </p>
          <button type="button" className="btn-wide" onClick={onUpgrade}>
            <IconLock /> Смотреть, кто
          </button>
        </div>
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
              {p.isSuper && <span className="likecard__super">🌟 Суперлайк</span>}
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
