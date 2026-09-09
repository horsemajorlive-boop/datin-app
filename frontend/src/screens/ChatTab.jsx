import ChatRail from '../components/ChatRail';
import ChatPane from '../components/ChatPane';

// Вкладка "Чат": слева узкая колонка со всеми мэтчами, справа — переписка.
//
// Props:
//   matches      — массив анкет (взаимные симпатии, + online/lastSeen)
//   messages     — объект { [matchId]: [сообщения] }
//   activities   — объект { [matchId]: 'typing' | 'emoji' | 'photo' }
//   myProfile    — своя анкета (для ИИ-помощника)
//   activeChat   — выбранный собеседник (или null)
//   onSelectChat — выбрать собеседника: onSelectChat(profile)
//   onSend       — отправить сообщение в активный чат: onSend({ type, text?, photo? })
//   onReact      — реакция на сообщение: onReact(messageId, emoji)

export default function ChatTab({
  matches,
  messages,
  activities,
  myProfile,
  activeChat,
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
        activeId={activeChat?.id}
        onSelect={onSelectChat}
      />

      {activeChat ? (
        <ChatPane
          match={activeChat}
          messages={messages[activeChat.id] || []}
          activity={activities[activeChat.id]}
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
