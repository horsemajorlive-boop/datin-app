// Экран "Это взаимно!" — показывается поверх всего при мэтче.
//
// Props:
//   me        — анкета пользователя (для левого аватара)
//   them      — анкета того, с кем мэтч (или null — тогда ничего не рисуем)
//   onClose   — закрыть и вернуться к листанию
//   onMessage — "Написать сообщение" (чат добавим позже — пока просто закрывает)

const FALLING_HEARTS = 16;

export default function MatchScreen({ me, them, onClose, onMessage }) {
  if (!them) return null;

  const myPhoto = me?.photos?.[0];
  const theirPhoto = them.photos?.[0];

  return (
    <div className="match">
      {/* Фоновый "дождь" из сердечек */}
      <div className="match__hearts" aria-hidden="true">
        {Array.from({ length: FALLING_HEARTS }).map((_, i) => (
          <span
            key={i}
            className="match__heart"
            style={{
              '--x': `${Math.random() * 100}%`,
              '--d': `${1.6 + Math.random() * 2.2}s`,
              '--delay': `${Math.random() * 1.8}s`,
              '--s': `${12 + Math.round(Math.random() * 22)}px`,
            }}
          >
            ❤️
          </span>
        ))}
      </div>

      <div className="match__content">
        <p className="match__title">Это взаимно!</p>
        <p className="match__subtitle">
          Вы и {them.name} понравились друг другу
        </p>

        <div className="match__avatars">
          <div className="match__avatar">
            {myPhoto ? (
              <img src={myPhoto} alt="Вы" />
            ) : (
              <span className="match__ph">Вы</span>
            )}
          </div>
          <span className="match__badge">💛</span>
          <div className="match__avatar">
            {theirPhoto ? (
              <img src={theirPhoto} alt={them.name} />
            ) : (
              <span className="match__ph">{them.name[0]}</span>
            )}
          </div>
        </div>

        <button className="btn-wide" onClick={onMessage}>
          Написать сообщение
        </button>
        <button className="btn-wide btn-wide--ghost" onClick={onClose}>
          Продолжить листать
        </button>
      </div>
    </div>
  );
}
