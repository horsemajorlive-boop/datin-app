import { useEffect, useState } from 'react';
import SwipeDeck from '../components/SwipeDeck';
import ProfileSheet from '../components/ProfileSheet';
import FilterSheet from '../components/FilterSheet';
import { IconSliders } from '../components/icons';
import { isFilterActive } from '../lib/filters';

// Экран "Поиск": колода карточек + фильтры + всплывающая анкета.
//
// Props:
//   feed            — массив анкет с сервера (уже отфильтрован)
//   filters         — текущие фильтры
//   onChangeFilters — применить новые фильтры
//   onSwipe         — onSwipe(profile, 'like' | 'pass')
//   onUndoSwipe     — onUndoSwipe(profile)

export default function DeckScreen({
  feed,
  filters,
  onChangeFilters,
  onSwipe,
  onUndoSwipe,
}) {
  const [opened, setOpened] = useState(null);
  const [locked, setLocked] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!locked) return;
    const timer = setTimeout(() => setLocked(false), 2500);
    return () => clearTimeout(timer);
  }, [locked]);

  return (
    <div className="screen screen--deck">
      <button
        className={`deck__filter ${isFilterActive(filters) ? 'is-active' : ''}`}
        onClick={() => setShowFilters(true)}
        aria-label="Фильтры"
      >
        <IconSliders />
      </button>

      <SwipeDeck
        profiles={feed}
        onSwipe={onSwipe}
        onUndo={onUndoSwipe}
        onOpen={setOpened}
        onPremiumLocked={() => setLocked(true)}
      />

      {locked && (
        <div className="paywall-hint">Возврат анкеты — функция премиума</div>
      )}

      <ProfileSheet profile={opened} onClose={() => setOpened(null)} />

      {showFilters && (
        <FilterSheet
          value={filters}
          onApply={(next) => {
            onChangeFilters(next);
            setShowFilters(false);
          }}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
