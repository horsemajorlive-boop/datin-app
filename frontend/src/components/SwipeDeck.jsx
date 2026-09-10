import { useState } from 'react';
import ProfileCard from './ProfileCard';
import LikeFx from './LikeFx';
import { isPremium } from '../premium';

// "Колода" карточек. Помнит:
//   - index   : на какой анкете мы сейчас
//   - history : список уже сделанных свайпов [{ profile, direction }] — нужен для "Вернуть"
//
// Props:
//   profiles        — массив анкет (лента с сервера)
//   onSwipe         — onSwipe(profile, 'like' | 'pass')
//   onUndo          — onUndo(profile) — откат последнего свайпа на сервере
//   onOpen          — открыть полную анкету
//   onPremiumLocked — сообщить, что функция "Вернуть" недоступна без премиума

export default function SwipeDeck({
  profiles,
  onSwipe,
  onUndo,
  onOpen,
  onPremiumLocked,
}) {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [likeFx, setLikeFx] = useState(0); // счётчик лайков — триггер для "салюта"

  function handleSwipe(direction) {
    const current = profiles[index];
    if (!current) return;

    const kind = direction === 'right' ? 'like' : 'pass';
    onSwipe(current, kind);
    if (kind === 'like') setLikeFx((n) => n + 1); // запускаем сердечки

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
    onUndo?.(last.profile); // сообщаем серверу отменить свайп

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
