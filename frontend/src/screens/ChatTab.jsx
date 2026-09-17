import { useState } from 'react';
import MatchesScreen from './MatchesScreen';
import SuperlikesScreen from './SuperlikesScreen';
import ChatPane from '../components/ChatPane';
import ScreenHeader from '../components/ScreenHeader';

// Вкладка "Чат" (мобильная раскладка в одну колонку):
//   - ничего не выбрано -> список диалогов ИЛИ вкладка "Суперлайки" (переключатель сверху);
//   - выбран мэтч       -> переписка на всю ширину, «‹ назад» в шапке.
//
// Props:
//   matches      — [{ matchId, profile, lastMessage }]
//   superlikes      — [{ ...profile, superlikeMessage, superlikeAt }] (GET /api/superlikes/incoming)
//   superlikeBusyId — id анкеты, для которой сейчас идёт запрос "Взаимно"/"Пропустить"
//   messages     — { [matchId]: [сообщения] }
//   activities   — { [matchId]: 'typing' | 'emoji' | 'photo' }
//   myProfile    — своя анкета (для ИИ-помощника)
//   activeChat   — анкета выбранного собеседника (или null)
//   activeChatId — matchId выбранного чата (или null) — прокидывается в ChatPane как matchId
//   partnerReadAt — до какого момента собеседник прочитал чат (для "Прочитано")
//   onSelectChat — выбрать чат / вернуться к списку: onSelectChat(matchId | null)
//   onBrowse     — уйти на вкладку «Поиск» (кнопка в пустом состоянии)
//   onReciprocateSuperlike — ответить взаимностью на суперлайк: (profile)
//   onPassSuperlike        — пропустить суперлайкнувшего: (profile)
//   onError      — показать пользователю текст ошибки (см. Toast в App.jsx) — проброс в ChatPane
//   onSend, onReact, onEditMessage, onDeleteMessage, onTyping, onLeftChat — проброс в ChatPane

export default function ChatTab({
  matches,
  superlikes,
  superlikeBusyId,
  messages,
  activities,
  myProfile,
  activeChat,
  activeChatId,
  partnerReadAt,
  onSelectChat,
  onBrowse,
  onReciprocateSuperlike,
  onPassSuperlike,
  onSend,
  onReact,
  onEditMessage,
  onDeleteMessage,
  onTyping,
  onLeftChat,
  onError,
}) {
  const [subTab, setSubTab] = useState('messages'); // 'messages' | 'superlikes'

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
          onError={onError}
        />
      </div>
    );
  }

  // Список диалогов / суперлайков — с переключателем сверху.
  return (
    <div className="screen">
      <ScreenHeader title="Чат" />

      <div className="chattabs">
        <button
          type="button"
          className={`chattabs__btn ${subTab === 'messages' ? 'is-on' : ''}`}
          onClick={() => setSubTab('messages')}
        >
          Сообщения
        </button>
        <button
          type="button"
          className={`chattabs__btn ${subTab === 'superlikes' ? 'is-on' : ''}`}
          onClick={() => setSubTab('superlikes')}
        >
          Суперлайки
          {superlikes.length > 0 && (
            <span className="chattabs__badge">{superlikes.length}</span>
          )}
        </button>
      </div>

      {subTab === 'messages' ? (
        <MatchesScreen
          matches={matches}
          onOpenChat={onSelectChat}
          emptyText="Пока не с кем переписываться. Появится мэтч — начнётся и переписка."
          onBrowse={onBrowse}
          bare
        />
      ) : (
        <SuperlikesScreen
          people={superlikes}
          busyId={superlikeBusyId}
          onReciprocate={onReciprocateSuperlike}
          onPass={onPassSuperlike}
          onBrowse={onBrowse}
        />
      )}
    </div>
  );
}
