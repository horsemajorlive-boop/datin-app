import { useState } from 'react';
import PhotoCarousel from './PhotoCarousel';
import InterestChips from './InterestChips';
import { useCarousel } from '../lib/useCarousel';

// Одна карточка анкеты в колоде.
// Одними и теми же событиями указателя ловим ДВА жеста:
//   - перетаскивание в сторону (> SWIPE_THRESHOLD) — свайп (лайк / пропуск);
//   - короткое касание почти без движения (< TAP_MAX_MOVE) — тап по фото (листаем).
//
// Props:
//   profile  — объект анкеты
//   active   — true только у верхней карточки (её можно трогать)
//   onSwipe  — onSwipe('left' | 'right')
//   onOpen   — открыть полную анкету

const SWIPE_THRESHOLD = 120; // px — дальше этого считаем свайп завершённым
const TAP_MAX_MOVE = 10; // px — если сдвинулись меньше, это тап, а не перетаскивание

export default function ProfileCard({ profile, active, onSwipe, onOpen }) {
  const [drag, setDrag] = useState({
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    dragging: false,
  });

  // Логика листания фото вынесена в свой хук.
  const photo = useCarousel(profile.photos.length);

  function handlePointerDown(e) {
    if (!active) return;
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
      onSwipe('right'); // утащили вправо — лайк
    } else if (drag.x < -SWIPE_THRESHOLD) {
      onSwipe('left'); // влево — пропуск
    } else if (isTap) {
      // Это тап. Смотрим, в какую половину карточки попали.
      const rect = e.currentTarget.getBoundingClientRect();
      const localX = e.clientX - rect.left; // координата тапа внутри карточки
      if (localX < rect.width / 2) photo.prev();
      else photo.next();
    }
    // иначе — потащили, но недостаточно: карточка просто вернётся на место

    setDrag({ x: 0, y: 0, startX: 0, startY: 0, dragging: false });
  }

  const style = {
    transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x * 0.04}deg)`,
    transition: drag.dragging ? 'none' : 'transform 0.3s ease',
  };

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

      {drag.x > 40 && <div className="card__stamp card__stamp--like">ЛАЙК</div>}
      {drag.x < -40 && <div className="card__stamp card__stamp--nope">НЕТ</div>}

      <div className="card__info">
        <h2>
          {profile.name}, {profile.age}
        </h2>
        <p className="card__city">{profile.city}</p>
        <p className="card__bio">{profile.bio}</p>
        <InterestChips interests={profile.interests} limit={3} />
        <button
          className="card__more"
          onPointerDown={(e) => e.stopPropagation()} /* не запускать жест карточки */
          onClick={onOpen}
        >
          Подробнее
        </button>
      </div>
    </div>
  );
}
