import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomNav from './components/BottomNav';
import DeckScreen from './screens/DeckScreen';
import LikesScreen from './screens/LikesScreen';
import MatchesScreen from './screens/MatchesScreen';
import MyProfileScreen from './screens/MyProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import VerificationScreen from './screens/VerificationScreen';
import AdminVerifications from './screens/AdminVerifications';
import SettingsScreen from './screens/SettingsScreen';
import Onboarding from './screens/Onboarding';
import MatchScreen from './components/MatchScreen';
import ChatTab from './screens/ChatTab';
import { initTelegram } from './telegram';
import { api, normalizeProfile, normalizeMessage } from './api';
import { connectSocket, onSocket, sendSocket } from './socket';
import { loadFilters, saveFilters, buildFeedQuery } from './lib/filters';
import './App.css';

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
  // какой экран показываем во вкладке "Профиль": view | edit | verify | admin
  const [profileView, setProfileView] = useState('view');
  const [filters, setFilters] = useState(loadFilters); // фильтры ленты (из localStorage)

  // таймеры авто-сброса статуса "печатает" по каждому чату
  const typingTimers = useRef({});

  // ---------- загрузка данных ----------

  const loadMe = useCallback(async () => {
    setMe(normalizeProfile(await api.get('/me')));
  }, []);

  const loadFeed = useCallback(async () => {
    const list = await api.get('/feed' + buildFeedQuery(filters));
    setFeed(list.map(normalizeProfile));
  }, [filters]);

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
    try {
      const list = await api.get(`/matches/${matchId}/messages`);
      setMessages((prev) => ({
        ...prev,
        [matchId]: list.map(normalizeMessage),
      }));
    } catch (err) {
      // мэтч мог исчезнуть (отмена свайпа) — просто закрываем этот чат
      console.warn('чат недоступен', matchId, err.message);
      setActiveChatId((cur) => (cur === matchId ? null : cur));
    }
  }, []);

  // Первая загрузка при запуске.
  useEffect(() => {
    initTelegram();
    loadMe();
    loadLikes();
    loadMatches();
  }, [loadMe, loadLikes, loadMatches]);

  // Лента — при запуске и при каждом изменении фильтров.
  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Изменились фильтры — сохраняем в localStorage.
  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  // Открыли чат — подгружаем его сообщения.
  useEffect(() => {
    if (activeChatId != null) loadChat(activeChatId);
  }, [activeChatId, loadChat]);

  // ---------- живое соединение (WebSocket) ----------

  useEffect(() => {
    connectSocket();

    const offs = [
      // при (пере)подключении — догоняем состояние
      onSocket('open', () => {
        loadMatches();
        if (activeChatId != null) loadChat(activeChatId);
      }),

      // новое сообщение от собеседника
      onSocket('message', ({ matchId, message }) => {
        const msg = normalizeMessage(message);
        setMessages((prev) => {
          const thread = prev[matchId];
          if (!thread) return prev; // чат не открыт — подтянется при открытии
          if (thread.some((m) => m.id === msg.id)) return prev; // уже есть
          return { ...prev, [matchId]: [...thread, msg] };
        });
        setActivities((prev) => {
          const next = { ...prev };
          delete next[matchId]; // дописал — статус убираем
          return next;
        });
        loadMatches(); // обновить превью и порядок в списке
      }),

      // реакция на сообщение
      onSocket('reaction', ({ matchId, messageId, reaction }) => {
        setMessages((prev) =>
          prev[matchId]
            ? {
                ...prev,
                [matchId]: prev[matchId].map((m) =>
                  m.id === messageId ? { ...m, reaction } : m
                ),
              }
            : prev
        );
      }),

      // собеседник печатает / выбирает эмодзи / фото
      onSocket('typing', ({ matchId, kind }) => {
        setActivities((prev) => ({ ...prev, [matchId]: kind || 'typing' }));
        clearTimeout(typingTimers.current[matchId]);
        typingTimers.current[matchId] = setTimeout(() => {
          setActivities((prev) => {
            const next = { ...prev };
            delete next[matchId];
            return next;
          });
        }, 5000);
      }),

      // кто-то зашёл/вышел
      onSocket('presence', ({ userId, online }) => {
        setMatches((prev) =>
          prev.map((m) =>
            m.profile.id === userId
              ? { ...m, profile: { ...m.profile, online } }
              : m
          )
        );
      }),

      // появился новый мэтч
      onSocket('match', () => loadMatches()),
    ];

    return () => offs.forEach((off) => off());
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
    setProfileView('view');
    loadFeed(); // имя/видимость могли поменяться
  }

  async function handleSend(payload) {
    const matchId = activeChatId;
    const sent = await api.post(`/matches/${matchId}/messages`, payload);
    // своё сообщение показываем сразу; ответ собеседника прилетит по WebSocket
    setMessages((prev) => ({
      ...prev,
      [matchId]: [...(prev[matchId] || []), normalizeMessage(sent)],
    }));
    loadMatches(); // обновить превью в списке
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

  // Пользователь печатает — сообщаем собеседнику (не чаще раза в 2 сек).
  const lastTypingSent = useRef(0);
  function handleTyping(kind = 'typing') {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = now;
    if (activeChatId != null) {
      sendSocket({ type: 'typing', matchId: activeChatId, kind });
    }
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
    if (profileView === 'edit') {
      return (
        <EditProfileScreen
          profile={me}
          onSave={handleSaveProfile}
          onCancel={() => setProfileView('view')}
        />
      );
    }
    if (profileView === 'verify') {
      return (
        <VerificationScreen
          status={me.verificationStatus}
          onBack={() => setProfileView('view')}
          onSubmitted={(profile) => {
            setMe(profile);
            setProfileView('view');
          }}
        />
      );
    }
    if (profileView === 'admin') {
      return (
        <AdminVerifications
          onBack={() => {
            setProfileView('view');
            loadMe(); // вдруг подтвердили в т.ч. себя
            loadFeed(); // галочки в ленте могли поменяться
          }}
        />
      );
    }
    if (profileView === 'settings') {
      return (
        <SettingsScreen
          profile={me}
          onBack={() => setProfileView('view')}
          onChangedProfile={(updated) => {
            setMe(updated);
            loadFeed(); // видимость в поиске могла поменяться
          }}
          onDeleted={() => window.location.reload()}
        />
      );
    }
    return (
      <MyProfileScreen
        profile={me}
        onEdit={() => setProfileView('edit')}
        onVerify={() => setProfileView('verify')}
        onModerate={() => setProfileView('admin')}
        onOpenSettings={() => setProfileView('settings')}
      />
    );
  }

  // Обязательный вход: пока анкета не готова (правила + фото + имя/возраст/пол),
  // показываем ТОЛЬКО экран онбординга — ни ленты, ни навигации.
  if (me && !me.onboarded) {
    return <Onboarding onDone={(profile) => setMe(profile)} />;
  }

  return (
    <div className="app">
      <main className="app__body">
        {tab === 'deck' && (
          <DeckScreen
            feed={feed}
            filters={filters}
            onChangeFilters={setFilters}
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
            onTyping={handleTyping}
          />
        )}
        {tab === 'me' && renderProfileTab()}
      </main>

      <BottomNav
        active={tab}
        onChange={(t) => {
          setTab(t);
          if (t !== 'me') setProfileView('view'); // ушли из профиля — сбрасываем подэкран
        }}
      />

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
