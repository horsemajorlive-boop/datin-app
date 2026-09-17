import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { IconMessage } from '../components/icons';

// Список мэтчей / диалогов. Тап по строке открывает чат.
// Используется как список внутри вкладки "Чат".
//
// Props:
//   matches    — [{ matchId, profile, lastMessage: { type, text, fromMe } | null }]
//   onOpenChat — открыть чат: onOpenChat(matchId)
//   title      — заголовок экрана (по умолчанию "Мэтчи")
//   emptyText  — текст, когда мэтчей нет
//   onBrowse   — уйти на вкладку «Поиск» (кнопка в пустом состоянии)
//   bare       — не рисовать свою шапку/обёртку .screen (когда её уже
//                рисует родитель, см. ChatTab — там сверху ещё переключатель
//                "Сообщения / Суперлайки")

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
  onBrowse,
  bare = false,
}) {
  const content =
    matches.length === 0 ? (
      <EmptyState
        icon={<IconMessage />}
        title="Пока нет диалогов"
        text={emptyText}
        actionLabel={onBrowse ? 'Листать анкеты' : undefined}
        onAction={onBrowse}
      />
    ) : (
      <div className="matchlist">
        {matches.map(({ matchId, profile, lastMessage, unread }) => (
          <button
            className={`matchlist__item ${unread ? 'is-unread' : ''}`}
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
                className={`matchlist__hint ${!lastMessage ? 'is-new' : ''} ${
                  unread ? 'is-unread' : ''
                }`}
              >
                {previewText(lastMessage)}
              </span>
            </div>
            {unread > 0 ? (
              <span className="matchlist__badge matchlist__badge--count">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : (
              !lastMessage && <span className="matchlist__badge" />
            )}
          </button>
        ))}
      </div>
    );

  if (bare) return content;

  return (
    <div className="screen">
      <ScreenHeader title={title} count={matches.length} />
      {content}
    </div>
  );
}
