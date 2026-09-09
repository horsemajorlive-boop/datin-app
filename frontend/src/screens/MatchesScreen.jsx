// Экран "Мэтчи" — список тех, с кем симпатия взаимна.
// Тап по строке открывает чат.
//
// Props:
//   matches    — массив анкет (взаимные симпатии)
//   messages   — объект со всеми чатами: { [matchId]: [сообщения] }
//   onOpenChat — открыть чат с анкетой: onOpenChat(profile)

export default function MatchesScreen({ matches, messages, onOpenChat }) {
  if (matches.length === 0) {
    return (
      <div className="screen">
        <h1 className="screen__title">Мэтчи</h1>
        <p className="muted">
          Пока пусто. Мэтч случается, когда вы и другой человек лайкнули друг друга.
        </p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="screen__title">Мэтчи ({matches.length})</h1>

      <div className="matchlist">
        {matches.map((person) => {
          const thread = messages[person.id] || [];
          const last = thread[thread.length - 1];
          // текст последнего сообщения (или подсказка, если переписки ещё нет)
          const preview = last
            ? (last.from === 'me' ? 'Вы: ' : '') + last.text
            : 'Вы мэтчнулись — напишите первым';

          return (
            <button
              className="matchlist__item"
              key={person.id}
              onClick={() => onOpenChat(person)}
            >
              <img
                className="matchlist__photo"
                src={person.photos[0]}
                alt={person.name}
              />
              <div className="matchlist__info">
                <span className="matchlist__name">
                  {person.name}, {person.age}
                </span>
                <span className="matchlist__hint">{preview}</span>
              </div>
              <span className="matchlist__chevron">›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
