import { useEffect, useRef, useState } from 'react';
import ProfileCard from './ProfileCard';
import LikeFx from './LikeFx';
import EmptyState from './EmptyState';
import SuperlikeComposer from './SuperlikeComposer';
import { IconX, IconHeart, IconHeartTriple, IconSearch } from './icons';

// "Колода" карточек. Помнит только index — на какой анкете мы сейчас.
//
// Сам свайп (палец или кнопка) не решает судьбу карточки мгновенно: сперва
// ProfileCard спрашивает через onSwipeAttempt, можно ли вообще свайпнуть
// (лимиты и т.п.), и только если да — улетает за край и лишь тогда зовёт
// onFlyEnd, где мы уже фиксируем ход. Кнопки под колодой свайпают ту же
// активную карточку императивно через cardRef — жест выглядит одинаково,
// откуда бы он ни пришёл.
//
// Props:
//   profiles       — массив анкет (лента с сервера)
//   onSwipe        — onSwipe(profile, 'like' | 'pass', { isSuper, message })
//   onOpen         — открыть полную анкету
//   onHint         — показать всплывающую подсказку: строка либо { text, cta, action } —
//                    с cta подсказка кликабельна, action — что сделать по клику
//                    (по умолчанию, если action не передан, — открыть Premium)
//   likesLeft      — сколько обычных лайков осталось сегодня (null = без лимита, Premium)
//   superlikesLeft — сколько суперлайков осталось сегодня
//   isPremium      — есть ли Premium

export default function SwipeDeck({
  profiles,
  onSwipe,
  onOpen,
  onHint,
  likesLeft = null,
  superlikesLeft = null,
  isPremium = false,
}) {
  const [index, setIndex] = useState(0);
  const [likeFx, setLikeFx] = useState(0); // счётчик лайков — триггер для "салюта"
  const cardRef = useRef(null); // текущая верхняя карточка — для свайпа с кнопок
  // Составление суперлайка (кнопка или свайп вверх) — сама карточка ещё не
  // улетела, ждём подтверждения (см. SuperlikeComposer).
  const [composing, setComposing] = useState(false);
  // Разовая подсказка про кнопку суперлайка — см. localStorage-эффект ниже.
  const [showSuperHint, setShowSuperHint] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem('superlike-hint-seen') === '1';
    } catch {
      /* приватный режим и т.п. — просто не покажем подсказку */
    }
    if (seen) return;
    setShowSuperHint(true);
    const timer = setTimeout(() => setShowSuperHint(false), 5000);
    try {
      localStorage.setItem('superlike-hint-seen', '1');
    } catch {
      /* не критично */
    }
    return () => clearTimeout(timer);
  }, []);

  // Можно ли вообще совершить этот свайп — спрашивает активная карточка,
  // ДО того как полететь за край; если нет — просто пружинит обратно.
  function handleSwipeAttempt(direction, meta = {}) {
    if (direction !== 'right') return true; // пропуск ничем не ограничен

    const isSuper = !!meta.isSuper;
    if (isSuper && superlikesLeft != null && superlikesLeft <= 0) {
      onHint?.(
        isPremium
          ? 'Суперлайк на сегодня уже использован'
          : { text: 'Суперлайки на сегодня закончились', cta: 'Оформить Premium — 5 в день' }
      );
      return false;
    }
    if (!isSuper && likesLeft != null && likesLeft <= 0) {
      onHint?.('Дневной лимит лайков исчерпан — возвращайтесь завтра');
      return false;
    }
    return true;
  }

  // Карточка долетела до края и погасла — теперь фиксируем ход по-настоящему.
  function handleFlyEnd(direction, meta = {}) {
    const current = profiles[index];
    if (!current) return;

    const kind = direction === 'right' ? 'like' : 'pass';
    const isSuper = kind === 'like' && !!meta.isSuper;

    onSwipe(current, kind, { isSuper, message: meta.message });
    if (kind === 'like') setLikeFx((n) => n + 1); // запускаем сердечки

    setIndex((i) => i + 1);
  }

  // Кнопки под колодой свайпают ту же карточку, что и палец, — тем же путём.
  function triggerSwipe(direction, meta) {
    cardRef.current?.swipe(direction, meta);
  }

  // Кнопка "Суперлайк" или свайп карточки вверх — сперва спрашиваем лимит
  // (та же проверка, что и у startFly), и только если можно — открываем
  // составление сообщения. Сама карточка летит уже после подтверждения.
  function requestSuperlike() {
    setShowSuperHint(false);
    if (!handleSwipeAttempt('right', { isSuper: true })) return;
    setComposing(true);
  }

  function confirmSuperlike(message) {
    setComposing(false);
    triggerSwipe('right', { isSuper: true, message });
  }

  const visible = profiles.slice(index, index + 3);
  const hasCard = visible.length > 0;
  const composingProfile = composing ? profiles[index] : null;

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
                ref={i === 0 ? cardRef : undefined}
                profile={profile}
                active={i === 0}
                onSwipeAttempt={handleSwipeAttempt}
                onFlyEnd={handleFlyEnd}
                onOpen={() => onOpen(profile)}
                onSuperlikeIntent={i === 0 ? requestSuperlike : undefined}
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
          className="btn btn--nope"
          onClick={() => triggerSwipe('left')}
          disabled={!hasCard}
          aria-label="Пропустить"
        >
          <IconX />
        </button>
        <div className="deck__super-wrap">
          <button
            className="btn btn--sm btn--super"
            onClick={requestSuperlike}
            disabled={!hasCard}
            aria-label="Суперлайк"
          >
            <IconHeartTriple filled />
            {superlikesLeft > 0 && <span className="btn__badge">{superlikesLeft}</span>}
          </button>
          {showSuperHint && (
            <div className="deck__super-hint">
              Суперлайк — заметная симпатия с сообщением. Можно смахнуть карточку вверх!
              <span className="deck__super-hint-arrow" />
            </div>
          )}
        </div>
        <button
          className="btn btn--like"
          onClick={() => triggerSwipe('right')}
          disabled={!hasCard || (likesLeft != null && likesLeft <= 0)}
          aria-label="Лайк"
        >
          <IconHeart filled />
        </button>
      </div>

      {composingProfile && (
        <SuperlikeComposer
          profile={composingProfile}
          onCancel={() => setComposing(false)}
          onConfirm={confirmSuperlike}
        />
      )}
    </div>
  );
}
