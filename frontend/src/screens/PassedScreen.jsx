import { useEffect, useState } from 'react';
import { api, normalizeProfile } from '../api';
import { IconX, IconRotateCcw, IconLock } from '../components/icons';
import { cityWithDistance } from '../lib/location';

// Склонение "анкета" под число — те же правила, что в LikesScreen.likersLine.
function passedLine(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `Вы пропустили ${n} анкету`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `Вы пропустили ${n} анкеты`;
  }
  return `Вы пропустили ${n} анкет`;
}

// Шторка "Кого вы пропустили" — продуктовый пробел из отзыва: раньше вернуть
// можно было только самый последний свайп (см. hasMissedLike в SwipeDeck),
// а если передумали про кого-то из более ранних — анкета была потеряна
// навсегда. GET /api/swipes/passed отдаёт всю историю пропусков, а вернуть
// конкретного человека — тот же POST /api/swipes/undo, что и раньше (он и
// без этого умел отменять свайп по любому targetId, не только последнему).
//
// Без Premium — тот же тизер-паттерн, что в LikesScreen ("кто лайкнул"):
// счётчик виден всем, личности скрыты (сервер сам маскирует, см.
// getPassedProfiles в models.js).
//
// Props:
//   isPremium  — есть ли Premium (иначе только счётчик + тизер)
//   onUpgrade  — перейти к оформлению Premium
//   onClose    — закрыть шторку
//   onRestored — кто-то вернулся в поиск — родителю стоит перезагрузить ленту

export default function PassedScreen({ isPremium, onUpgrade, onClose, onRestored }) {
  const [people, setPeople] = useState(null); // null = загрузка
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    api
      .get('/swipes/passed')
      .then((list) => setPeople(list.map(normalizeProfile)))
      .catch(() => setPeople([]));
  }, []);

  async function restore(profile) {
    setRestoringId(profile.id);
    try {
      await api.post('/swipes/undo', { targetId: profile.id });
      setPeople((prev) => prev.filter((p) => p.id !== profile.id));
      onRestored?.();
    } catch (err) {
      console.error('не удалось вернуть анкету', err);
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__card" onClick={(e) => e.stopPropagation()}>
        <span className="sheet__grab" />
        <div className="sheet__body">
          <div className="filtersheet__head">
            <h2>Кого вы пропустили</h2>
            <button
              className="filtersheet__close"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <IconX />
            </button>
          </div>

          {people === null ? (
            <p className="muted">Загрузка…</p>
          ) : people.length === 0 ? (
            <p className="muted">
              Пока некого возвращать — либо ещё никого не пропускали, либо
              уже всех вернули.
            </p>
          ) : !isPremium ? (
            <div className="likes-locked">
              <div className="likes-locked__stack">
                {people.slice(0, 4).map((p) => (
                  <img
                    key={p.id}
                    className="likes-locked__photo"
                    src={p.photos[0]}
                    alt=""
                  />
                ))}
              </div>
              <p className="likes-locked__count">{passedLine(people.length)}</p>
              <h2 className="likes-locked__title">Передумали?</h2>
              <p className="likes-locked__text">
                С TiAmo Premium можно вернуть любую пропущенную анкету обратно
                в поиск.
              </p>
              <button type="button" className="btn-wide" onClick={onUpgrade}>
                <IconLock /> Вернуть анкеты
              </button>
            </div>
          ) : (
            <div className="likes">
              {people.map((p) => (
                <div className="likecard" key={p.id}>
                  <div className="likecard__photo">
                    <img src={p.photos[0]} alt={p.name} />
                  </div>
                  <div className="likecard__info">
                    <span className="likecard__name">
                      {p.name}, {p.age}
                    </span>
                    {(p.city || p.distanceKm != null) && (
                      <span className="likecard__city">
                        {cityWithDistance(p.city, p.distanceKm)}
                      </span>
                    )}
                  </div>
                  <div className="likecard__actions">
                    <button
                      type="button"
                      className="likecard__btn likecard__btn--restore"
                      onClick={() => restore(p)}
                      disabled={restoringId === p.id}
                      aria-label="Вернуть в поиск"
                    >
                      <IconRotateCcw />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
