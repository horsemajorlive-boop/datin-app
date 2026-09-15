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
//   activeChatId — matchId выбранного чата (или null) — прокидывается в ChatPane как matchId
//   partnerReadAt — до какого момента собеседник прочитал чат (для "Прочитано")
//   onSelectChat — выбрать чат / вернуться к списку: onSelectChat(matchId | null)
//   onBrowse     — уйти на вкладку «Поиск» (кнопка в пустом состоянии)
//   onSend, onReact, onEditMessage, onDeleteMessage, onTyping, onLeftChat — проброс в ChatPane

export default function ChatTab({
  matches,
  messages,
  activities,
  myProfile,
  activeChat,
  activeChatId,
  partnerReadAt,
  onSelectChat,
  onBrowse,
  onSend,
  onReact,
  onEditMessage,
  onDeleteMessage,
  onTyping,
  onLeftChat,
}) {
  // Открыт конкретный диалог — показываем переписку целиком.
  if (activeChat) {
    return (
      <div className="chattab">
        <ChatPane
          match={activeChat}
          matchId={activeChatId}
          messages={messages[activeChatId] || []}
          activity={activities[activeChatId]}
          myProfile={myProfile}
          partnerReadAt={partnerReadAt}
          onBack={() => onSelectChat(null)}
          onSend={onSend}
          onReact={onReact}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
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
