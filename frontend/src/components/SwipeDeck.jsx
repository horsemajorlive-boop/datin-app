import { useState } from 'react';
import ProfileCard from './ProfileCard';
import LikeFx from './LikeFx';
import { isPremium } from '../premium';

// "Колода" карточек. Помнит:
//   - index   : на какой анкете мы сейчас
//   - history : список уже сделанных свайпов [{ profile, direction }] — нужен для "Вернуть"
//
// Props:
//   profiles        — массив всех анкет
//   onLike / onNope — вызвать при лайке / пропуске
//   onOpen          — открыть полную анкету
//   onUndoLike      — отменить лайк (убрать анкету из "Симпатий")
//   onPremiumLocked — сообщить, что функция "Вернуть" недоступна без премиума

export default function SwipeDeck({
  profiles,
  onLike,
  onNope,
  onOpen,
  onUndoLike,
  onPremiumLocked,
}) {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [likeFx, setLikeFx] = useState(0); // счётчик лайков — триггер для "салюта"

  function handleSwipe(direction) {
    const current = profiles[index];
    if (!current) return;

    if (direction === 'right') {
      onLike(current);
      setLikeFx((n) => n + 1); // запускаем сердечки
    } else {
      onNope(current);
    }

    // запоминаем ход, чтобы его можно было отменить
    setHistory((h) => [...h, { profile: current, direction }]);
    setIndex((i) => i + 1);
  }

  function handleUndo() {
    if (history.length === 0) return;

    // Премиум-проверка. Пока isPremium() === true, поэтому просто работает.
    if (!isPremium()) {
      onPremiumLocked?.();
      return;
    }

    const last = history[history.length - 1];

    // если отменяем лайк — надо убрать анкету из "Симпатий"
    if (last.direction === 'right') onUndoLike?.(last.profile);

    setHistory((h) => h.slice(0, -1)); // выкидываем последний ход
    setIndex((i) => Math.max(0, i - 1)); // возвращаемся на карточку назад
  }

  const visible = profiles.slice(index, index + 3);
  const hasCard = visible.length > 0;
  const canUndo = history.length > 0;

  return (
    <div className="deck">
      <LikeFx fireKey={likeFx} />

      <div className="deck__stack">
        {hasCard ? (
          visible.map((profile, i) => (
            <div
              className="deck__slot"
              key={profile.id}
              style={{
                zIndex: visible.length - i,
                transform: `scale(${1 - i * 0.04}) translateY(${i * 14}px)`,
              }}
            >
              <ProfileCard
                profile={profile}
                active={i === 0}
                onSwipe={handleSwipe}
                onOpen={() => onOpen(profile)}
              />
            </div>
          ))
        ) : (
          <div className="deck__empty">
            Анкеты закончились 🫠
            <br />
            Загляните позже
          </div>
        )}
      </div>

      <div className="deck__actions">
        <button
          className="btn btn--sm btn--undo"
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label="Вернуть анкету"
        >
          ⟲
        </button>
        <button
          className="btn btn--nope"
          onClick={() => handleSwipe('left')}
          disabled={!hasCard}
          aria-label="Пропустить"
        >
          ✕
        </button>
        <button
          className="btn btn--like"
          onClick={() => handleSwipe('right')}
          disabled={!hasCard}
          aria-label="Лайк"
        >
          ♥
        </button>
      </div>
    </div>
  );
}
