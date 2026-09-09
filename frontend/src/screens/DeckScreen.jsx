import { useEffect, useState } from 'react';
import SwipeDeck from '../components/SwipeDeck';
import ProfileSheet from '../components/ProfileSheet';
import { profiles } from '../data/profiles';

// Экран "Поиск": колода карточек + всплывающая анкета.
//
// Props:
//   onLike     — сообщить приложению, что анкету лайкнули
//   onUndoLike — сообщить, что лайк отменён (кнопка "Вернуть")

export default function DeckScreen({ onLike, onUndoLike }) {
  const [opened, setOpened] = useState(null); // какая анкета открыта подробно
  const [locked, setLocked] = useState(false); // показывать ли подсказку про премиум

  // Когда показали подсказку — прячем её через 2.5 секунды.
  useEffect(() => {
    if (!locked) return;
    const timer = setTimeout(() => setLocked(false), 2500);
    return () => clearTimeout(timer); // убираем таймер, если компонент исчез раньше
  }, [locked]);

  return (
    <div className="screen screen--deck">
      <SwipeDeck
        profiles={profiles}
        onLike={onLike}
        onNope={() => {}}
        onOpen={setOpened}
        onUndoLike={onUndoLike}
        onPremiumLocked={() => setLocked(true)}
      />

      {locked && (
        <div className="paywall-hint">Возврат анкеты — функция премиума</div>
      )}

      <ProfileSheet profile={opened} onClose={() => setOpened(null)} />
    </div>
  );
}
