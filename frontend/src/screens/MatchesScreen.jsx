// Экран "Мэтчи" — список тех, с кем симпатия взаимна. Тап открывает чат.
//
// Props:
//   matches    — [{ matchId, profile, lastMessage: { type, text, fromMe } | null }]
//   onOpenChat — открыть чат: onOpenChat(matchId)

function previewText(last) {
  if (!last) return 'Вы мэтчнулись — напишите первым';
  const body =
    last.type === 'photo' ? '📷 Фото' : last.type === 'emoji' ? last.text : last.text;
  return (last.fromMe ? 'Вы: ' : '') + body;
}

export default function MatchesScreen({ matches, onOpenChat }) {
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
        {matches.map(({ matchId, profile, lastMessage }) => (
          <button
            className="matchlist__item"
            key={matchId}
            onClick={() => onOpenChat(matchId)}
          >
            <img
              className="matchlist__photo"
              src={profile.photos[0]}
              alt={profile.name}
            />
            <div className="matchlist__info">
              <span className="matchlist__name">
                {profile.name}, {profile.age}
              </span>
              <span className="matchlist__hint">{previewText(lastMessage)}</span>
            </div>
            <span className="matchlist__chevron">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
