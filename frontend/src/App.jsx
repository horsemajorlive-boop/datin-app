import { useEffect, useMemo, useState } from 'react';
import BottomNav from './components/BottomNav';
import DeckScreen from './screens/DeckScreen';
import LikesScreen from './screens/LikesScreen';
import MatchesScreen from './screens/MatchesScreen';
import MyProfileScreen from './screens/MyProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import MatchScreen from './components/MatchScreen';
import ChatTab from './screens/ChatTab';
import { initTelegram } from './telegram';
import { loadMyProfile, saveMyProfile } from './data/myProfile';
import { randomReply } from './data/chatReplies';
import { BOT_EMOJI, BOT_PHOTOS } from './data/emojiPalette';
import './App.css';

// Короткий случайный id для сообщения.
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Случайный элемент массива.
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Эмодзи, которыми "собеседник" иногда реагирует на наши сообщения.
const BOT_REACTIONS = ['❤️', '😂', '🔥', '👍'];

// Корневой компонент. Он хранит всё общее состояние приложения:
//  - tab          : какая вкладка открыта
//  - liked        : кого пользователь лайкнул
//  - matches      : с кем симпатия взаимна (+ online, lastSeen)
//  - matchPopup   : анкета для всплывающего экрана "Это взаимно!"
//  - messages     : все переписки { [matchId]: [сообщения] }
//  - activities   : кто что сейчас делает { [matchId]: 'typing' | 'emoji' | 'photo' }
//  - activeChatId : id выбранного собеседника во вкладке "Чат"
//  - myProfile    : анкета самого пользователя
//  - editing      : открыт ли сейчас экран редактирования

export default function App() {
  const [tab, setTab] = useState('deck');
  const [liked, setLiked] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchPopup, setMatchPopup] = useState(null);
  const [messages, setMessages] = useState({});
  const [activities, setActivities] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);

  const [myProfile, setMyProfile] = useState(loadMyProfile);
  const [editing, setEditing] = useState(false);

  // "Живой" собеседник для открытого чата — всегда берём свежую версию из matches
  // (там обновляется online/lastSeen), а не устаревший объект.
  const activeChat = useMemo(
    () => matches.find((m) => m.id === activeChatId) || null,
    [matches, activeChatId]
  );

  useEffect(() => {
    initTelegram();
  }, []);

  useEffect(() => {
    saveMyProfile(myProfile);
  }, [myProfile]);

  // Раз в 12 сек случайный мэтч меняет статус онлайн/оффлайн.
  // Уходя оффлайн — фиксируем "был в сети сейчас".
  useEffect(() => {
    const iv = setInterval(() => {
      setMatches((prev) => {
        if (prev.length === 0) return prev;
        const i = Math.floor(Math.random() * prev.length);
        return prev.map((m, idx) => {
          if (idx !== i) return m;
          const goOnline = !m.online;
          return {
            ...m,
            online: goOnline,
            lastSeen: goOnline ? m.lastSeen : Date.now(),
          };
        });
      });
    }, 12000);
    return () => clearInterval(iv);
  }, []);

  function openChatWith(person) {
    setActiveChatId(person.id);
    setTab('chat');
  }

  function handleLike(profile) {
    setLiked((prev) =>
      prev.some((p) => p.id === profile.id) ? prev : [...prev, profile]
    );

    if (profile.likesYou) {
      // Дополняем анкету "присутствием": часть мэтчей сразу онлайн,
      // остальные "были в сети" когда-то за последние 3 часа.
      const enriched = {
        ...profile,
        online: Math.random() < 0.5,
        lastSeen: Date.now() - Math.floor(Math.random() * 3 * 60 * 60 * 1000),
      };
      setMatches((prev) =>
        prev.some((p) => p.id === profile.id) ? prev : [...prev, enriched]
      );
      setMatchPopup(enriched);
    }
  }

  function handleUndoLike(profile) {
    setLiked((prev) => prev.filter((p) => p.id !== profile.id));
    setMatches((prev) => prev.filter((p) => p.id !== profile.id));
    setMessages((prev) => {
      const next = { ...prev };
      delete next[profile.id];
      return next;
    });
    if (activeChatId === profile.id) setActiveChatId(null);
  }

  // Отправка сообщения. payload = { type: 'text'|'emoji'|'photo', text?, photo? }
  function handleSend(payload) {
    const chatId = activeChatId;
    const myMsg = { id: makeId(), from: 'me', ts: Date.now(), type: 'text', ...payload };

    setMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), myMsg],
    }));

    // Заглушка "живого" собеседника.
    // 1. через 0.5 сек показываем статус активности
    const kind = pick(['typing', 'typing', 'typing', 'emoji', 'photo']);
    setTimeout(() => {
      setActivities((prev) => ({ ...prev, [chatId]: kind }));
    }, 500);

    // 2. через ~2.1 сек убираем статус, иногда ставим реакцию и присылаем ответ
    setTimeout(() => {
      setActivities((prev) => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });

      setMessages((prev) => {
        let thread = prev[chatId] || [];

        if (Math.random() < 0.35) {
          thread = thread.map((m) =>
            m.id === myMsg.id ? { ...m, reaction: pick(BOT_REACTIONS) } : m
          );
        }

        // Тип ответа зависит от того, что "делал" собеседник.
        let reply;
        if (kind === 'emoji') reply = { type: 'emoji', text: pick(BOT_EMOJI) };
        else if (kind === 'photo') reply = { type: 'photo', photo: pick(BOT_PHOTOS) };
        else reply = { type: 'text', text: randomReply() };

        return {
          ...prev,
          [chatId]: [
            ...thread,
            { id: makeId(), from: 'them', ts: Date.now(), ...reply },
          ],
        };
      });
    }, 2100);
  }

  function handleReact(messageId, emoji) {
    const chatId = activeChatId;
    setMessages((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map((m) =>
        m.id === messageId
          ? { ...m, reaction: m.reaction === emoji ? undefined : emoji }
          : m
      ),
    }));
  }

  function handleSaveProfile(nextProfile) {
    setMyProfile(nextProfile);
    setEditing(false);
  }

  function renderProfileTab() {
    if (editing) {
      return (
        <EditProfileScreen
          profile={myProfile}
          onSave={handleSaveProfile}
          onCancel={() => setEditing(false)}
        />
      );
    }
    return (
      <MyProfileScreen profile={myProfile} onEdit={() => setEditing(true)} />
    );
  }

  return (
    <div className="app">
      <main className="app__body">
        {tab === 'deck' && (
          <DeckScreen onLike={handleLike} onUndoLike={handleUndoLike} />
        )}
        {tab === 'likes' && <LikesScreen liked={liked} />}
        {tab === 'matches' && (
          <MatchesScreen
            matches={matches}
            messages={messages}
            onOpenChat={openChatWith}
          />
        )}
        {tab === 'chat' && (
          <ChatTab
            matches={matches}
            messages={messages}
            activities={activities}
            myProfile={myProfile}
            activeChat={activeChat}
            onSelectChat={(person) => setActiveChatId(person.id)}
            onSend={handleSend}
            onReact={handleReact}
          />
        )}
        {tab === 'me' && renderProfileTab()}
      </main>

      <BottomNav active={tab} onChange={setTab} />

      <MatchScreen
        me={myProfile}
        them={matchPopup}
        onClose={() => setMatchPopup(null)}
        onMessage={() => {
          const person = matchPopup;
          setMatchPopup(null);
          openChatWith(person);
        }}
      />
    </div>
  );
}
