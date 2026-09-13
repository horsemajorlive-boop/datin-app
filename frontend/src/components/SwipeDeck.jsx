import { useEffect, useState } from 'react';
import ProfileCard from './ProfileCard';
import LikeFx from './LikeFx';
import EmptyState from './EmptyState';
import { IconX, IconHeart, IconHeartTriple, IconRotateCcw, IconSearch } from './icons';

// "Колода" карточек. Помнит:
//   - index   : на какой анкете мы сейчас
//   - history : список уже сделанных свайпов [{ profile, direction }] — нужен для "Вернуть"
//
// Props:
//   profiles       — массив анкет (лента с сервера)
//   onSwipe        — onSwipe(profile, 'like' | 'pass', { isSuper })
//   onUndo         — onUndo(profile) — откат последнего свайпа на сервере
//   onOpen         — открыть полную анкету
//   onHint         — показать всплывающую подсказку: строка либо { text, cta, action } —
//                    с cta подсказка кликабельна, action — что сделать по клику
//                    (по умолчанию, если action не передан, — открыть Premium)
//   likesLeft      — сколько обычных лайков осталось сегодня (null = без лимита, Premium)
//   superlikesLeft — сколько суперлайков осталось сегодня
//   isPremium      — есть ли Premium (нужен для "Вернуть")
//   hasMissedLike  — последний свайп был пропуском того, кто уже лайкнул вас —
//                    тогда и только тогда показываем золотую кнопку "Вернуть"

export default function SwipeDeck({
  profiles,
  onSwipe,
  onUndo,
  onOpen,
  onHint,
  likesLeft = null,
  superlikesLeft = null,
  isPremium = false,
  hasMissedLike = false,
}) {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [likeFx, setLikeFx] = useState(0); // счётчик лайков — триггер для "салюта"

  // Пропустили того, кто уже лайкнул, — сами предлагаем вернуться. Как только
  // возможность пропадает (вернули анкету или сделали новый свайп) — если
  // подсказка ещё висит, она уже неактуальна, гасим её же вызовом.
  useEffect(() => {
    if (hasMissedLike) {
      onHint?.({
        text: 'Вы пропустили того, кто уже вас лайкнул',
        cta: 'Вернуться к анкете',
        action: handleUndo,
      });
    } else {
      onHint?.(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMissedLike]);

  function handleSwipe(direction, opts = {}) {
    const current = profiles[index];
    if (!current) return;

    const kind = direction === 'right' ? 'like' : 'pass';
    const isSuper = kind === 'like' && !!opts.isSuper;

    if (kind === 'like') {
      if (isSuper && superlikesLeft != null && superlikesLeft <= 0) {
        onHint?.(
          isPremium
            ? 'Суперлайк на сегодня уже использован'
            : { text: 'Суперлайки на сегодня закончились', cta: 'Оформить Premium — 5 в день' }
        );
        return;
      }
      if (!isSuper && likesLeft != null && likesLeft <= 0) {
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
    if (!hasMissedLike || history.length === 0) return;

    if (!isPremium) {
      onHint?.({
        text: 'Вы пропустили того, кто уже вас лайкнул',
        cta: 'Оформить Premium — верните анкету',
      });
      return;
    }

    const last = history[history.length - 1];
    onUndo?.(last.profile); // сообщаем серверу отменить свайп

    setHistory((h) => h.slice(0, -1)); // выкидываем последний ход
    setIndex((i) => Math.max(0, i - 1)); // возвращаемся на карточку назад
  }

  const visible = profiles.slice(index, index + 3);
  const hasCard = visible.length > 0;

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
        {hasMissedLike && (
          <button
            className="btn btn--sm btn--undo"
            onClick={handleUndo}
            aria-label="Вернуть анкету — вы пропустили того, кто вас лайкнул"
          >
            <IconRotateCcw />
          </button>
        )}
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
          disabled={!hasCard}
          aria-label="Суперлайк"
        >
          <IconHeartTriple filled />
          {superlikesLeft > 0 && <span className="btn__badge">{superlikesLeft}</span>}
        </button>
        <button
          className="btn btn--like"
          onClick={() => handleSwipe('right')}
          disabled={!hasCard || (likesLeft != null && likesLeft <= 0)}
          aria-label="Лайк"
        >
          <IconHeart filled />
        </button>
      </div>
    </div>
  );
}
