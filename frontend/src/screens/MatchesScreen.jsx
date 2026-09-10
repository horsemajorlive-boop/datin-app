// Список мэтчей / диалогов. Тап по строке открывает чат.
// Используется и на вкладке "Мэтчи", и как список внутри вкладки "Чат".
//
// Props:
//   matches    — [{ matchId, profile, lastMessage: { type, text, fromMe } | null }]
//   onOpenChat — открыть чат: onOpenChat(matchId)
//   title      — заголовок экрана (по умолчанию "Мэтчи")
//   emptyText  — текст, когда мэтчей нет

function previewText(last) {
  if (!last) return 'Вы мэтчнулись — напишите первым';
  const body = last.type === 'photo' ? 'Фотография' : last.text;
  return (last.fromMe ? 'Вы: ' : '') + body;
}

export default function MatchesScreen({
  matches,
  onOpenChat,
  title = 'Мэтчи',
  emptyText = 'Пока пусто. Мэтч случается, когда вы и другой человек лайкнули друг друга.',
}) {
  if (matches.length === 0) {
    return (
      <div className="screen">
        <h1 className="screen__title">{title}</h1>
        <p className="muted">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="screen__title">
        {title} <span className="screen__count">{matches.length}</span>
      </h1>

      <div className="matchlist">
        {matches.map(({ matchId, profile, lastMessage }) => (
          <button
            className="matchlist__item"
            key={matchId}
            onClick={() => onOpenChat(matchId)}
          >
            <span className="matchlist__ava">
              <img src={profile.photos[0]} alt={profile.name} />
              {profile.online && <span className="matchlist__online" />}
            </span>
            <div className="matchlist__info">
              <span className="matchlist__name">
                {profile.name}, {profile.age}
              </span>
              <span
                className={`matchlist__hint ${!lastMessage ? 'is-new' : ''}`}
              >
                {previewText(lastMessage)}
              </span>
            </div>
            {!lastMessage && <span className="matchlist__badge" />}
          </button>
        ))}
      </div>
    </div>
  );
}
