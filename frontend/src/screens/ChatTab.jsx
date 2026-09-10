import ChatRail from '../components/ChatRail';
import ChatPane from '../components/ChatPane';

// Вкладка "Чат": слева колонка мэтчей, справа переписка.
//
// Props:
//   matches      — [{ matchId, profile, lastMessage }]
//   messages     — { [matchId]: [сообщения] }
//   activities   — { [matchId]: 'typing' | 'emoji' | 'photo' }
//   myProfile    — своя анкета (для ИИ-помощника)
//   activeChat   — анкета выбранного собеседника (или null)
//   activeChatId — matchId выбранного чата (или null)
//   onSelectChat — выбрать чат: onSelectChat(matchId)
//   onSend       — отправить сообщение: onSend({ type, text?, photo? })
//   onReact      — реакция: onReact(messageId, emoji)

export default function ChatTab({
  matches,
  messages,
  activities,
  myProfile,
  activeChat,
  activeChatId,
  onSelectChat,
  onSend,
  onReact,
}) {
  if (matches.length === 0) {
    return (
      <div className="screen">
        <h1 className="screen__title">Чат</h1>
        <p className="muted">
          Пока не с кем переписываться. Появится мэтч — появится и чат.
        </p>
      </div>
    );
  }

  return (
    <div className="chattab">
      <ChatRail
        matches={matches}
        messages={messages}
        activeId={activeChatId}
        onSelect={onSelectChat}
      />

      {activeChat ? (
        <ChatPane
          match={activeChat}
          messages={messages[activeChatId] || []}
          activity={activities[activeChatId]}
          myProfile={myProfile}
          onSend={onSend}
          onReact={onReact}
        />
      ) : (
        <div className="chattab__empty">
          Выберите мэтч слева, чтобы начать переписку
        </div>
      )}
    </div>
  );
}
