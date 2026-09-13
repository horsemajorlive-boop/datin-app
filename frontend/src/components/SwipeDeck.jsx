import { useState } from 'react';
import ProfileCard from './ProfileCard';
import LikeFx from './LikeFx';
import EmptyState from './EmptyState';
import { IconX, IconHeart, IconStar, IconRotateCcw, IconSearch } from './icons';
import { isPremium } from '../premium';

// "Колода" карточек. Помнит:
//   - index   : на какой анкете мы сейчас
//   - history : список уже сделанных свайпов [{ profile, direction }] — нужен для "Вернуть"
//
// Props:
//   profiles       — массив анкет (лента с сервера)
//   onSwipe        — onSwipe(profile, 'like' | 'pass', { isSuper })
//   onUndo         — onUndo(profile) — откат последнего свайпа на сервере
//   onOpen         — открыть полную анкету
//   onHint         — показать всплывающую подсказку-ограничение (текст строкой)
//   likesLeft      — сколько обычных лайков осталось сегодня
//   superlikesLeft — сколько суперлайков осталось сегодня

export default function SwipeDeck({
  profiles,
  onSwipe,
  onUndo,
  onOpen,
  onHint,
  likesLeft = Infinity,
  superlikesLeft = Infinity,
}) {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [likeFx, setLikeFx] = useState(0); // счётчик лайков — триггер для "салюта"

  function handleSwipe(direction, opts = {}) {
    const current = profiles[index];
    if (!current) return;

    const kind = direction === 'right' ? 'like' : 'pass';
    const isSuper = kind === 'like' && !!opts.isSuper;

    if (kind === 'like') {
      if (isSuper && superlikesLeft <= 0) {
        onHint?.('Суперлайк на сегодня уже использован');
        return;
      }
      if (!isSuper && likesLeft <= 0) {
        onHint?.('Дневной лимит лайков исчерпан — возвращайтесь завтра');
        return;
      }
    }

    onSwipe(current, kind, { isSuper });
    if (kind === 'like') setLikeFx((n) => n + 1); // запускаем сердечки

    // запоминаем ход, чтобы его можно было отменить
    setHistory((h) => [...h, { profile: current, direction }]);
    setIndex((i) => i + 1);
  }

  function handleUndo() {
    if (history.length === 0) return;

    // Премиум-проверка. Пока isPremium() === true, поэтому просто работает.
    if (!isPremium()) {
      onHint?.('Возврат анкеты — функция премиума');
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
            <EmptyState
              icon={<IconSearch />}
              title="Анкеты закончились"
              text="Вы просмотрели всех, кто подходит под фильтры. Загляните позже или измените их в настройках поиска."
            />
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
          <IconRotateCcw />
        </button>
        <button
          className="btn btn--nope"
          onClick={() => handleSwipe('left')}
          disabled={!hasCard}
          aria-label="Пропустить"
        >
          <IconX />
        </button>
        <button
          className="btn btn--sm btn--super"
          onClick={() => handleSwipe('right', { isSuper: true })}
          disabled={!hasCard || superlikesLeft <= 0}
          aria-label="Суперлайк"
        >
          <IconStar filled />
          {superlikesLeft > 0 && <span className="btn__badge">{superlikesLeft}</span>}
        </button>
        <button
          className="btn btn--like"
          onClick={() => handleSwipe('right')}
          disabled={!hasCard || likesLeft <= 0}
          aria-label="Лайк"
        >
          <IconHeart filled />
        </button>
      </div>
    </div>
  );
}
