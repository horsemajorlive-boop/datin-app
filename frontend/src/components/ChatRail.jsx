// Узкая колонка слева со всеми мэтчами — переключатель чатов.
//
// Props:
//   matches  — массив анкет (+ online)
//   messages — объект { [matchId]: [сообщения] } (для точки "новый чат")
//   activeId — id выбранного собеседника
//   onSelect — выбрать собеседника: onSelect(profile)

export default function ChatRail({ matches, messages, activeId, onSelect }) {
  return (
    <div className="rail">
      {matches.map((person) => {
        const isNew = (messages[person.id] || []).length === 0;
        return (
          <button
            key={person.id}
            type="button"
            className={`rail__item ${person.id === activeId ? 'is-active' : ''}`}
            onClick={() => onSelect(person)}
            title={person.name}
          >
            <img src={person.photos[0]} alt={person.name} />
            {person.online && <span className="rail__online" />}
            {isNew && <span className="rail__dot" />}
          </button>
        );
      })}
    </div>
  );
}
