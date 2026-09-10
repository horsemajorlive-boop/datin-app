import MatchesScreen from './MatchesScreen';
import ChatPane from '../components/ChatPane';

// Вкладка "Чат" (мобильная раскладка в одну колонку):
//   - ничего не выбрано -> список диалогов на всю ширину;
//   - выбран мэтч       -> переписка на всю ширину, «‹ назад» в шапке.
//
// Props:
//   matches      — [{ matchId, profile, lastMessage }]
//   messages     — { [matchId]: [сообщения] }
//   activities   — { [matchId]: 'typing' | 'emoji' | 'photo' }
//   myProfile    — своя анкета (для ИИ-помощника)
//   activeChat   — анкета выбранного собеседника (или null)
//   activeChatId — matchId выбранного чата (или null)
//   onSelectChat — выбрать чат / вернуться к списку: onSelectChat(matchId | null)
//   onBrowse     — уйти на вкладку «Поиск» (кнопка в пустом состоянии)
//   onSend, onReact, onTyping, onLeftChat — проброс в ChatPane

export default function ChatTab({
  matches,
  messages,
  activities,
  myProfile,
  activeChat,
  activeChatId,
  onSelectChat,
  onBrowse,
  onSend,
  onReact,
  onTyping,
  onLeftChat,
}) {
  // Открыт конкретный диалог — показываем переписку целиком.
  if (activeChat) {
    return (
      <div className="chattab">
        <ChatPane
          match={activeChat}
          messages={messages[activeChatId] || []}
          activity={activities[activeChatId]}
          myProfile={myProfile}
          onBack={() => onSelectChat(null)}
          onSend={onSend}
          onReact={onReact}
          onTyping={onTyping}
          onLeftChat={onLeftChat}
        />
      </div>
    );
  }

  // Иначе — список диалогов (тот же, что на вкладке «Мэтчи»).
  return (
    <MatchesScreen
      matches={matches}
      onOpenChat={onSelectChat}
      title="Сообщения"
      emptyText="Пока не с кем переписываться. Появится мэтч — начнётся и переписка."
      onBrowse={onBrowse}
    />
  );
}
