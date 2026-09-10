import { useCallback, useEffect, useMemo, useState } from 'react';
import BottomNav from './components/BottomNav';
import DeckScreen from './screens/DeckScreen';
import LikesScreen from './screens/LikesScreen';
import MatchesScreen from './screens/MatchesScreen';
import MyProfileScreen from './screens/MyProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import MatchScreen from './components/MatchScreen';
import ChatTab from './screens/ChatTab';
import { initTelegram } from './telegram';
import { api, normalizeProfile, normalizeMessage } from './api';
import './App.css';

// Сид-боты имеют такие id и умеют авто-отвечать в чате.
const BOT_ID_MIN = 900000;

const ACTIVITY_KINDS = ['typing', 'typing', 'typing', 'emoji', 'photo'];
const randomKind = () =>
  ACTIVITY_KINDS[Math.floor(Math.random() * ACTIVITY_KINDS.length)];

// Корневой компонент. Всё общее состояние теперь приходит с сервера:
//  me        — своя анкета (GET /api/me)
//  feed      — кого листать (GET /api/feed)
//  likes     — кого я лайкнул (GET /api/likes)
//  matches   — мэтчи с последним сообщением (GET /api/matches)
//  messages  — { [matchId]: [сообщения] }, грузится по мере открытия чатов
//  activities — локальная имитация "печатает…" для чатов с ботами

export default function App() {
  const [tab, setTab] = useState('deck');

  const [me, setMe] = useState(null); // null = ещё грузится
  const [feed, setFeed] = useState([]);
  const [likes, setLikes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [messages, setMessages] = useState({});
  const [activities, setActivities] = useState({});

  const [activeChatId, setActiveChatId] = useState(null);
  const [matchPopup, setMatchPopup] = useState(null);
  const [editing, setEditing] = useState(false);

  // ---------- загрузка данных ----------

  const loadMe = useCallback(async () => {
    setMe(normalizeProfile(await api.get('/me')));
  }, []);

  const loadFeed = useCallback(async () => {
    setFeed((await api.get('/feed')).map(normalizeProfile));
  }, []);

  const loadLikes = useCallback(async () => {
    setLikes((await api.get('/likes')).map(normalizeProfile));
  }, []);

  const loadMatches = useCallback(async () => {
    const list = await api.get('/matches');
    setMatches(
      list.map((m) => ({ ...m, profile: normalizeProfile(m.profile) }))
    );
  }, []);

  const loadChat = useCallback(async (matchId) => {
    const list = await api.get(`/matches/${matchId}/messages`);
    setMessages((prev) => ({ ...prev, [matchId]: list.map(normalizeMessage) }));
  }, []);

  // Первая загрузка при запуске.
  useEffect(() => {
    initTelegram();
    loadMe();
    loadFeed();
    loadLikes();
    loadMatches();
  }, [loadMe, loadFeed, loadLikes, loadMatches]);

  // Открыли чат — подгружаем его сообщения.
  useEffect(() => {
    if (activeChatId != null) loadChat(activeChatId);
  }, [activeChatId, loadChat]);

  // Пока нет WebSocket — раз в 20 сек обновляем мэтчи (presence, последние
  // сообщения) и активный чат, чтобы видеть ответы собеседника.
  useEffect(() => {
    const iv = setInterval(() => {
      loadMatches();
      if (activeChatId != null) loadChat(activeChatId);
    }, 20000);
    return () => clearInterval(iv);
  }, [loadMatches, loadChat, activeChatId]);

  // ---------- действия ----------

  function openChat(matchId) {
    setActiveChatId(matchId);
    setTab('chat');
  }

  async function handleSwipe(profile, direction) {
    try {
      const res = await api.post('/swipes', {
        targetId: profile.id,
        direction,
      });
      if (direction === 'like') {
        setLikes((prev) =>
          prev.some((p) => p.id === profile.id) ? prev : [...prev, profile]
        );
      }
      if (res.match) {
        await loadMatches();
        setMatchPopup({
          ...normalizeProfile(res.withUser),
          matchId: res.matchId,
        });
      }
    } catch (err) {
      console.error('swipe failed', err);
    }
  }

  async function handleUndoSwipe(profile) {
    const affected = matches.find((m) => m.profile.id === profile.id);
    try {
      await api.post('/swipes/undo', { targetId: profile.id });
      setLikes((prev) => prev.filter((p) => p.id !== profile.id));
      if (affected && activeChatId === affected.matchId) setActiveChatId(null);
      await loadMatches();
    } catch (err) {
      console.error('undo failed', err);
    }
  }

  async function handleSaveProfile(data) {
    const saved = await api.put('/me', data);
    setMe(normalizeProfile(saved));
    setEditing(false);
    loadFeed(); // имя/видимость могли поменяться
  }

  async function handleSend(payload) {
    const matchId = activeChatId;
    const sent = await api.post(`/matches/${matchId}/messages`, payload);
    setMessages((prev) => ({
      ...prev,
      [matchId]: [...(prev[matchId] || []), normalizeMessage(sent)],
    }));

    // Собеседник-бот ответит через пару секунд. Показываем статус и потом
    // перезагружаем чат, чтобы подхватить его сообщение.
    const partner = matches.find((m) => m.matchId === matchId)?.profile;
    if (partner && partner.id >= BOT_ID_MIN) {
      const kind = randomKind();
      setActivities((prev) => ({ ...prev, [matchId]: kind }));
      setTimeout(() => {
        setActivities((prev) => {
          const next = { ...prev };
          delete next[matchId];
          return next;
        });
        loadChat(matchId);
        loadMatches(); // обновить превью в списке
      }, 2200);
    }
  }

  async function handleReact(messageId, emoji) {
    const matchId = activeChatId;
    const res = await api.post(`/messages/${messageId}/reaction`, { emoji });
    setMessages((prev) => ({
      ...prev,
      [matchId]: (prev[matchId] || []).map((m) =>
        m.id === messageId ? { ...m, reaction: res.reaction } : m
      ),
    }));
  }

  // Свежая анкета собеседника открытого чата (из matches — там обновляется presence).
  const activeChat = useMemo(
    () => matches.find((m) => m.matchId === activeChatId)?.profile || null,
    [matches, activeChatId]
  );

  function renderProfileTab() {
    if (!me) {
      return (
        <div className="screen">
          <p className="muted">Загрузка…</p>
        </div>
      );
    }
    if (editing) {
      return (
        <EditProfileScreen
          profile={me}
          onSave={handleSaveProfile}
          onCancel={() => setEditing(false)}
        />
      );
    }
    return <MyProfileScreen profile={me} onEdit={() => setEditing(true)} />;
  }

  return (
    <div className="app">
      <main className="app__body">
        {tab === 'deck' && (
          <DeckScreen
            feed={feed}
            onSwipe={handleSwipe}
            onUndoSwipe={handleUndoSwipe}
          />
        )}
        {tab === 'likes' && <LikesScreen liked={likes} />}
        {tab === 'matches' && (
          <MatchesScreen matches={matches} onOpenChat={openChat} />
        )}
        {tab === 'chat' && (
          <ChatTab
            matches={matches}
            messages={messages}
            activities={activities}
            myProfile={me}
            activeChat={activeChat}
            activeChatId={activeChatId}
            onSelectChat={setActiveChatId}
            onSend={handleSend}
            onReact={handleReact}
          />
        )}
        {tab === 'me' && renderProfileTab()}
      </main>

      <BottomNav active={tab} onChange={setTab} />

      <MatchScreen
        me={me}
        them={matchPopup}
        onClose={() => setMatchPopup(null)}
        onMessage={() => {
          const id = matchPopup?.matchId;
          setMatchPopup(null);
          if (id != null) openChat(id);
        }}
      />
    </div>
  );
}
