// Узкая колонка слева со всеми мэтчами — переключатель чатов.
//
// Props:
//   matches  — [{ matchId, profile: { photos, online, ... } }]
//   messages — объект { [matchId]: [сообщения] } (для точки "новый чат")
//   activeId — matchId выбранного чата
//   onSelect — выбрать чат: onSelect(matchId)

export default function ChatRail({ matches, messages, activeId, onSelect }) {
  return (
    <div className="rail">
      {matches.map(({ matchId, profile }) => {
        const isNew = (messages[matchId] || []).length === 0;
        return (
          <button
            key={matchId}
            type="button"
            className={`rail__item ${matchId === activeId ? 'is-active' : ''}`}
            onClick={() => onSelect(matchId)}
            title={profile.name}
          >
            <span className="rail__avatar">
              <img src={profile.photos[0]} alt={profile.name} />
              {profile.online && <span className="rail__online" />}
              {isNew && <span className="rail__dot" />}
            </span>
            <span className="rail__name">{profile.name}</span>
          </button>
        );
      })}
    </div>
  );
}
