import { forwardRef, useImperativeHandle, useState } from 'react';
import PhotoCarousel from './PhotoCarousel';
import InterestChips from './InterestChips';
import VerifiedBadge from './VerifiedBadge';
import { IconChevronLeft } from './icons';
import { useCarousel } from '../lib/useCarousel';
import { cityWithDistance } from '../lib/location';

// Одна карточка анкеты в колоде.
// Одними и теми же событиями указателя ловим ДВА жеста:
//   - перетаскивание в сторону (> SWIPE_THRESHOLD) — свайп (лайк / пропуск);
//   - короткое касание почти без движения (< TAP_MAX_MOVE) — тап по фото (листаем).
//
// Свайп — не мгновенный: карточка долетает до края экрана и гаснет, и только
// потом сообщаем родителю, что свайп состоялся (см. onFlyEnd). Кнопки под
// колодой (лайк/пропуск/супер) свайпают эту же карточку императивно через ref
// (SwipeDeck.cardRef.current.swipe(...)) — так жест выглядит одинаково,
// откуда бы он ни пришёл, с пальца или с кнопки.
//
// Props:
//   profile         — объект анкеты
//   active          — true только у верхней карточки (её можно трогать)
//   onSwipeAttempt  — onSwipeAttempt(direction, meta) => boolean — можно ли
//                     свайпнуть (лимиты и т.п.); false — карточка не улетает
//   onFlyEnd        — onFlyEnd(direction, meta) — вызывается, когда карточка
//                     долетела до края и погасла; тут родитель уже фиксирует свайп
//   onOpen          — открыть полную анкету

const SWIPE_THRESHOLD = 120; // px — дальше этого считаем свайп завершённым
const TAP_MAX_MOVE = 10; // px — если сдвинулись меньше, это тап, а не перетаскивание
const FLY_MS = 300; // должно совпадать с длительностью transition ниже
const FLY_DISTANCE = 560; // px — насколько улетает карточка за край экрана

const REST_DRAG = { x: 0, y: 0, startX: 0, startY: 0, dragging: false };

const ProfileCard = forwardRef(function ProfileCard(
  { profile, active, onSwipeAttempt, onFlyEnd, onOpen },
  ref
) {
  const [drag, setDrag] = useState(REST_DRAG);
  const [flying, setFlying] = useState(null); // { direction, meta } | null

  // Логика листания фото вынесена в свой хук.
  const photo = useCarousel(profile.photos.length);

  function startFly(direction, meta = {}) {
    if (!onSwipeAttempt(direction, meta)) {
      setDrag(REST_DRAG); // отказали (лимит и т.п.) — просто пружиним обратно
      return;
    }
    setDrag((d) => ({ ...d, dragging: false }));
    setFlying({ direction, meta });
    setTimeout(() => onFlyEnd(direction, meta), FLY_MS);
  }

  // Кнопки под колодой свайпают активную карточку через этот же путь.
  useImperativeHandle(ref, () => ({
    swipe: (direction, meta) => startFly(direction, meta),
  }));

  function handlePointerDown(e) {
    if (!active || flying) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, startX: e.clientX, startY: e.clientY, dragging: true });
  }

  function handlePointerMove(e) {
    setDrag((d) => {
      if (!d.dragging) return d;
      return { ...d, x: e.clientX - d.startX, y: e.clientY - d.startY };
    });
  }

  function handlePointerUp(e) {
    if (!drag.dragging) return;

    const isTap =
      Math.abs(drag.x) < TAP_MAX_MOVE && Math.abs(drag.y) < TAP_MAX_MOVE;

    if (drag.x > SWIPE_THRESHOLD) {
      startFly('right');
      return;
    }
    if (drag.x < -SWIPE_THRESHOLD) {
      startFly('left');
      return;
    }
    if (isTap) {
      // Это тап. Смотрим, в какую половину карточки попали.
      const rect = e.currentTarget.getBoundingClientRect();
      const localX = e.clientX - rect.left; // координата тапа внутри карточки
      if (localX < rect.width / 2) photo.prev();
      else photo.next();
    }
    // иначе — потащили, но недостаточно: карточка просто вернётся на место
    setDrag(REST_DRAG);
  }

  const isFlying = !!flying;
  const x = isFlying ? (flying.direction === 'right' ? FLY_DISTANCE : -FLY_DISTANCE) : drag.x;
  const y = isFlying ? drag.y * 0.4 : drag.y;
  const rotate = isFlying ? (flying.direction === 'right' ? 22 : -22) : drag.x * 0.04;

  const style = {
    transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)`,
    opacity: isFlying ? 0 : 1,
    transition: drag.dragging
      ? 'none'
      : `transform ${FLY_MS}ms ease-out, opacity ${FLY_MS}ms ease-out`,
  };

  const showLike = isFlying ? flying.direction === 'right' : drag.x > 40;
  const showNope = isFlying ? flying.direction === 'left' : drag.x < -40;
  const stampOpacity = isFlying ? 1 : Math.min(1, Math.abs(drag.x) / 110);

  return (
    <div
      className="card"
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <PhotoCarousel
        photos={profile.photos}
        index={photo.index}
        alt={profile.name}
      />
      <div className="card__overlay" />

      {profile.isBoosted && <span className="card__boost">🚀 Поднято</span>}

      {showLike && (
        <div className="card__stamp card__stamp--like" style={{ opacity: stampOpacity }}>
          Лайк
        </div>
      )}
      {showNope && (
        <div className="card__stamp card__stamp--nope" style={{ opacity: stampOpacity }}>
          Пропустить
        </div>
      )}

      <div className="card__info">
        <h2>
          <span className="card__name">
            {profile.name} <span className="card__age">{profile.age}</span>
          </span>
          {profile.verified && <VerifiedBadge />}
        </h2>
        {(profile.city || profile.distanceKm != null) && (
          <p className="card__city">{cityWithDistance(profile.city, profile.distanceKm)}</p>
        )}
        <InterestChips interests={profile.interests} limit={3} />
        <button
          className="card__more"
          onPointerDown={(e) => e.stopPropagation()} /* не запускать жест карточки */
          onClick={onOpen}
        >
          Подробнее <IconChevronLeft />
        </button>
      </div>
    </div>
  );
});

export default ProfileCard;
