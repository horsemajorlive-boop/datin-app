import { useEffect, useState } from 'react';
import SwipeDeck from '../components/SwipeDeck';
import ProfileSheet from '../components/ProfileSheet';

// Экран "Поиск": колода карточек + всплывающая анкета.
//
// Props:
//   feed         — массив анкет с сервера
//   onSwipe      — onSwipe(profile, 'like' | 'pass')
//   onUndoSwipe  — onUndoSwipe(profile) — откат на сервере

export default function DeckScreen({ feed, onSwipe, onUndoSwipe }) {
  const [opened, setOpened] = useState(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!locked) return;
    const timer = setTimeout(() => setLocked(false), 2500);
    return () => clearTimeout(timer);
  }, [locked]);

  return (
    <div className="screen screen--deck">
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
    </div>
  );
}
