import { useEffect, useState } from 'react';
import SwipeDeck from '../components/SwipeDeck';
import ProfileSheet from '../components/ProfileSheet';
import FilterSheet from '../components/FilterSheet';
import ScreenHeader from '../components/ScreenHeader';
import { IconSliders } from '../components/icons';
import { isFilterActive } from '../lib/filters';

// Экран "Поиск": колода карточек + фильтры + всплывающая анкета.
//
// Props:
//   feed            — массив анкет с сервера (уже отфильтрован)
//   filters         — текущие фильтры
//   onChangeFilters — применить новые фильтры
//   onSwipe         — onSwipe(profile, 'like' | 'pass')
//   hasLocation     — поделился ли пользователь геопозицией (для фильтра "рядом")
//   onShareLocation — onShareLocation(lat, lng)
//   onClearLocation — забыть геопозицию
//   likesLeft       — сколько обычных лайков осталось сегодня
//   superlikesLeft  — сколько суперлайков осталось сегодня
//   isPremium       — есть ли Premium (снимает лимиты и фильтр по быту)
//   onOpenPremium   — перейти к оформлению Premium (настройки)

export default function DeckScreen({
  feed,
  filters,
  onChangeFilters,
  onSwipe,
  onBlockOrReport,
  myInterests,
  hasLocation,
  onShareLocation,
  onClearLocation,
  likesLeft,
  superlikesLeft,
  isPremium,
  onOpenPremium,
}) {
  const [opened, setOpened] = useState(null);
  const [hint, setHint] = useState(null); // строка либо { text, cta }
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!hint) return;
    // с кнопкой "оформить" даём больше времени успеть нажать
    const timer = setTimeout(() => setHint(null), hint.cta ? 5000 : 2500);
    return () => clearTimeout(timer);
  }, [hint]);

  return (
    <div className="screen screen--deck">
      <ScreenHeader title="Поиск">
        <button
          className={`scrhead__btn ${isFilterActive(filters) ? 'is-active' : ''}`}
          onClick={() => setShowFilters(true)}
          aria-label="Фильтры"
        >
          <IconSliders />
        </button>
      </ScreenHeader>

      <SwipeDeck
        profiles={feed}
        onSwipe={onSwipe}
        onOpen={setOpened}
        onHint={setHint}
        likesLeft={likesLeft}
        superlikesLeft={superlikesLeft}
        isPremium={isPremium}
      />

      {hint && (
        <div
          className={`paywall-hint ${hint.cta ? 'paywall-hint--action' : ''}`}
          onClick={
            hint.cta
              ? () => {
                  setHint(null);
                  (hint.action || onOpenPremium)?.();
                }
              : undefined
          }
        >
          {typeof hint === 'string' ? hint : hint.text}
          {hint.cta && <span className="paywall-hint__cta">{hint.cta}</span>}
        </div>
      )}

      <ProfileSheet
        profile={opened}
        myInterests={myInterests}
        onClose={() => setOpened(null)}
        onResolved={() => {
          setOpened(null);
          onBlockOrReport?.();
        }}
      />

      {showFilters && (
        <FilterSheet
          value={filters}
          onApply={(next) => {
            onChangeFilters(next);
            setShowFilters(false);
          }}
          onClose={() => setShowFilters(false)}
          hasLocation={hasLocation}
          onShareLocation={onShareLocation}
          onClearLocation={onClearLocation}
          isPremium={isPremium}
          onUpgrade={onOpenPremium}
        />
      )}
    </div>
  );
}
