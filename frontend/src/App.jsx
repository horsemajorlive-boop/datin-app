import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomNav from './components/BottomNav';
import Splash from './components/Splash';
import DeckScreen from './screens/DeckScreen';
import LikesScreen from './screens/LikesScreen';
import MyProfileScreen from './screens/MyProfileScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import VerificationScreen from './screens/VerificationScreen';
import AdminPanel from './screens/AdminPanel';
import SettingsScreen from './screens/SettingsScreen';
import Onboarding from './screens/Onboarding';
import MatchScreen from './components/MatchScreen';
import MissedLikeNudge from './components/MissedLikeNudge';
import ChatTab from './screens/ChatTab';
import { initTelegram } from './telegram';
import { api, normalizeProfile, normalizeMessage } from './api';
import { connectSocket, onSocket, sendSocket } from './socket';
import { loadFilters, saveFilters, buildFeedQuery } from './lib/filters';
import './App.css';

// Корневой компонент. Всё общее состояние теперь приходит с сервера:
//  me        — своя анкета (GET /api/me)
//  feed      — кого листать (GET /api/feed)
//  incoming  — кто лайкнул меня и ждёт ответа (GET /api/likes/incoming)
//  matches   — мэтчи с последним сообщением (GET /api/matches)
//  messages  — { [matchId]: [сообщения] }, грузится по мере открытия чатов
//  activities — локальная имитация "печатает…" для чатов с ботами

export default function App() {
  const [tab, setTab] = useState('deck');
  const [adminMode, setAdminMode] = useState(false); // секретный вход — см. useAdminGesture

  // Заставка при запуске: логотип держим на экране минимум SPLASH_MS,
  // затем полсекунды угасает, и только после этого показываем приветствие/приложение.
  const [splashDone, setSplashDone] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);
  useEffect(() => {
    const SPLASH_MS = 1300;
    const FADE_MS = 420;
    const doneTimer = setTimeout(() => setSplashDone(true), SPLASH_MS);
    const hideTimer = setTimeout(() => setSplashHidden(true), SPLASH_MS + FADE_MS);
    return () => {
      clearTimeout(doneTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const [me, setMe] = useState(null); // null = ещё грузится
  const [feed, setFeed] = useState([]);
  const [incoming, setIncoming] = useState([]); // кто лайкнул меня
  const [superlikes, setSuperlikes] = useState([]); // кто суперлайкнул и ждёт ответа (вкладка "Суперлайки")
  const [superlikeBusyId, setSuperlikeBusyId] = useState(null); // id анкеты, для которой сейчас идёт запрос
  const [matches, setMatches] = useState([]);
  const [messages, setMessages] = useState({});
  const [activities, setActivities] = useState({});

  const [activeChatId, setActiveChatId] = useState(null);
  const [matchPopup, setMatchPopup] = useState(null);
  // Пропустили (без Premium) того, кто уже нас лайкнул — не подсказываем это
  // сразу (слишком очевидно, кого именно пропустили), а ждём случайное число
  // свайпов подряд (3–6) и потом ненавязчиво напоминаем про Premium — см.
  // handleSwipe и <MissedLikeNudge> ниже.
  const [, setMissedLikeCountdown] = useState(null); // { remaining } | null — читаем только через функциональный setState
  const [showMissedLikeNudge, setShowMissedLikeNudge] = useState(false);
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

  const loadIncoming = useCallback(async () => {
    setIncoming((await api.get('/likes/incoming')).map(normalizeProfile));
  }, []);

  const loadSuperlikes = useCallback(async () => {
    setSuperlikes((await api.get('/superlikes/incoming')).map(normalizeProfile));
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

  // Отметить переписку прочитанной: сразу гасим счётчик локально, потом сервер.
  const markRead = useCallback(
    async (matchId) => {
      setMatches((prev) =>
        prev.map((m) => (m.matchId === matchId ? { ...m, unread: 0 } : m))
      );
      try {
        await api.post(`/matches/${matchId}/read`);
      } catch {
        /* не критично — счётчик поправится при следующей загрузке */
      }
      loadMatches();
    },
    [loadMatches]
  );

  // Первая загрузка при запуске.
  useEffect(() => {
    initTelegram();
    loadMe();
    loadIncoming();
    loadSuperlikes();
    loadMatches();
  }, [loadMe, loadIncoming, loadSuperlikes, loadMatches]);

  // Лента — при запуске и при каждом изменении фильтров.
  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Оформили Premium прямо во время отсчёта до напоминания — оно больше
  // не нужно (всех, кто лайкнул, теперь и так видно во «Симпатиях»).
  useEffect(() => {
    if (me?.isPremium) {
      setMissedLikeCountdown(null);
      setShowMissedLikeNudge(false);
    }
  }, [me?.isPremium]);

  // Изменились фильтры — сохраняем в localStorage.
  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  // Открыт чат и мы на вкладке «Чат» — подгружаем сообщения и отмечаем
  // переписку прочитанной (в т.ч. при возврате на вкладку с уже открытым чатом).
  useEffect(() => {
    if (tab === 'chat' && activeChatId != null) {
      loadChat(activeChatId);
      markRead(activeChatId);
    }
  }, [tab, activeChatId, loadChat, markRead]);

  // Что сейчас на экране — для обработчика входящих сообщений (без пересборки сокета).
  const viewRef = useRef({ tab, activeChatId });
  useEffect(() => {
    viewRef.current = { tab, activeChatId };
  }, [tab, activeChatId]);

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
        // Смотрим ли мы прямо сейчас на этот чат? Тогда сразу «прочитано»
        // (markRead сам перезагрузит список). Иначе — обновляем превью и счётчик.
        const v = viewRef.current;
        if (v.tab === 'chat' && v.activeChatId === matchId) markRead(matchId);
        else loadMatches();
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
      onSocket('match', () => {
        loadMatches();
        loadIncoming(); // этот человек больше не «ждёт ответа»
        loadSuperlikes(); // и мог быть в "Суперлайках" — тоже уберётся
      }),

      // нас суперлайкнули — обновить вкладку "Суперлайки"
      onSocket('superlike', () => loadSuperlikes()),

      // собеседник прочитал переписку — подтянуть partnerReadAt для "Прочитано"
      onSocket('read', () => loadMatches()),

      // собеседник отредактировал своё сообщение
      onSocket('messageEdited', ({ matchId, messageId, text, editedAt }) => {
        setMessages((prev) =>
          prev[matchId]
            ? {
                ...prev,
                [matchId]: prev[matchId].map((m) =>
                  m.id === messageId ? { ...m, text, editedAt } : m
                ),
              }
            : prev
        );
      }),

      // собеседник удалил своё сообщение
      onSocket('messageDeleted', ({ matchId, messageId }) => {
        setMessages((prev) =>
          prev[matchId]
            ? {
                ...prev,
                [matchId]: prev[matchId].map((m) =>
                  m.id === messageId
                    ? { ...m, deleted: true, text: null, photo: null, reaction: null }
                    : m
                ),
              }
            : prev
        );
      }),
    ];

    return () => offs.forEach((off) => off());
  }, [loadMatches, loadIncoming, loadSuperlikes, loadChat, markRead, activeChatId]);

  // ---------- действия ----------

  function openChat(matchId) {
    setActiveChatId(matchId);
    setTab('chat');
  }

  // Переход к оформлению Premium (вкладка "Профиль" → "Настройки") —
  // общий обработчик для всех мест, где предлагают апгрейд.
  function goToPremium() {
    setTab('me');
    setProfileView('settings');
  }

  function dismissMissedLikeNudge() {
    setShowMissedLikeNudge(false);
  }

  function upgradeFromMissedLikeNudge() {
    setShowMissedLikeNudge(false);
    goToPremium();
  }

  async function handleSwipe(profile, direction, { isSuper = false, message } = {}) {
    try {
      const res = await api.post('/swipes', {
        targetId: profile.id,
        direction,
        superlike: isSuper,
        message,
      });
      if (res.match) {
        await loadMatches();
        setMatchPopup({
          ...normalizeProfile(res.withUser),
          matchId: res.matchId,
        });
      }
      // Без Premium — считаем свайпы к ненавязчивому напоминанию про
      // пропущенную симпатию (см. состояние выше). С Premium это не нужно:
      // все, кто лайкнул, и так видны во «Симпатиях».
      if (!me?.isPremium) {
        setMissedLikeCountdown((cd) => {
          if (direction === 'pass' && res.missedLike && !cd) {
            return { remaining: 3 + Math.floor(Math.random() * 4) }; // 3..6
          }
          if (!cd) return cd;
          const remaining = cd.remaining - 1;
          if (remaining <= 0) {
            setShowMissedLikeNudge(true);
            return null;
          }
          return { remaining };
        });
      }
      // мог свайпнуть того, кто уже лайкал меня — обновим «Симпатии»
      loadIncoming();
      // лайк потратил дневной лимит — обновим остаток
      if (direction === 'like') loadMe();
    } catch (err) {
      console.error('swipe failed', err);
    }
  }

  // Решение на вкладке «Симпатии»: ответить взаимностью или пропустить.
  async function handleIncomingDecision(profile, direction) {
    setIncoming((prev) => prev.filter((p) => p.id !== profile.id)); // сразу убираем
    await handleSwipe(profile, direction);
  }

  // "Пропустить" на вкладке «Суперлайки» — обычный пропуск, тем же путём,
  // что и «Симпатии»: сообщение просто пропадёт из списка.
  async function handlePassSuperlike(profile) {
    setSuperlikes((prev) => prev.filter((p) => p.id !== profile.id)); // сразу убираем
    await handleSwipe(profile, 'pass');
  }

  // "Взаимно" на вкладке «Суперлайки» — мгновенный мэтч без Premium и без
  // учёта дневного лимита лайков (см. respondToSuperlike на сервере).
  async function handleReciprocateSuperlike(profile) {
    setSuperlikeBusyId(profile.id);
    try {
      const res = await api.post(`/superlikes/${profile.id}/reciprocate`);
      setSuperlikes((prev) => prev.filter((p) => p.id !== profile.id));
      await loadMatches();
      setMatchPopup({ ...normalizeProfile(res.withUser), matchId: res.matchId });
    } catch (err) {
      console.error('reciprocate superlike failed', err);
    } finally {
      setSuperlikeBusyId(null);
    }
  }

  // После жалобы/блокировки (сам запрос уже сделал компонент) — обновляем всё,
  // где мог остаться заблокированный человек.
  function refreshAfterBlock() {
    loadFeed();
    loadIncoming();
    loadSuperlikes();
    loadMatches();
  }

  function handleLeftChat() {
    setActiveChatId(null);
    setTab('chat');
    refreshAfterBlock();
  }

  async function handleSaveProfile(data) {
    const saved = await api.put('/me', data);
    setMe(normalizeProfile(saved));
    setProfileView('view');
    loadFeed(); // имя/видимость могли поменяться
  }

  // Геопозиция для поиска "рядом" — отдельно от формы анкеты (кнопка в фильтрах).
  async function handleShareLocation(lat, lng) {
    const res = await api.post('/me/location', { lat, lng });
    setMe((prev) => (prev ? { ...prev, hasLocation: res.hasLocation } : prev));
    loadFeed(); // теперь можно посчитать расстояние до анкет
  }

  async function handleClearLocation() {
    const res = await api.post('/me/location', { clear: true });
    setMe((prev) => (prev ? { ...prev, hasLocation: res.hasLocation } : prev));
    // без геопозиции радиус всё равно ни на что не влияет — не оставляем
    // фильтр висеть "включённым" вхолостую
    setFilters((f) => (f.radiusKm ? { ...f, radiusKm: '' } : f));
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

  async function handleEditMessage(messageId, text) {
    const matchId = activeChatId;
    const res = await api.patch(`/messages/${messageId}`, { text });
    setMessages((prev) => ({
      ...prev,
      [matchId]: (prev[matchId] || []).map((m) =>
        m.id === messageId ? { ...m, text: res.text, editedAt: res.editedAt } : m
      ),
    }));
    loadMatches(); // сообщение могло быть последним в превью списка
  }

  async function handleDeleteMessage(messageId) {
    const matchId = activeChatId;
    await api.del(`/messages/${messageId}`);
    setMessages((prev) => ({
      ...prev,
      [matchId]: (prev[matchId] || []).map((m) =>
        m.id === messageId
          ? { ...m, deleted: true, text: null, photo: null, reaction: null }
          : m
      ),
    }));
    loadMatches(); // если удалённое было последним в превью — обновить его
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

  // Открытый мэтч целиком (из matches — там обновляется presence и partnerReadAt).
  const activeMatch = useMemo(
    () => matches.find((m) => m.matchId === activeChatId) || null,
    [matches, activeChatId]
  );
  // Свежая анкета собеседника открытого чата.
  const activeChat = activeMatch?.profile || null;

  // Всего непрочитанных сообщений — для бейджа на вкладке «Чат».
  const totalUnread = useMemo(
    () => matches.reduce((sum, m) => sum + (m.unread || 0), 0),
    [matches]
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
    if (profileView === 'settings') {
      return (
        <SettingsScreen
          profile={me}
          onBack={() => setProfileView('view')}
          onChangedProfile={(updated) => {
            setMe(updated);
            loadFeed(); // видимость в поиске могла поменяться
          }}
          onBlockedChanged={() => loadFeed()}
          onDeleted={() => window.location.reload()}
        />
      );
    }
    return (
      <MyProfileScreen
        profile={me}
        onEdit={() => setProfileView('edit')}
        onVerify={() => setProfileView('verify')}
        onOpenSettings={() => setProfileView('settings')}
        onChangedProfile={setMe}
        onAdminUnlock={() => setAdminMode(true)}
      />
    );
  }

  if (!splashHidden) {
    return <Splash fading={splashDone} />;
  }

  // Секретный жест (сердечко онбординга или логотип в шапке профиля) —
  // отдельный режим без знакомств.
  if (adminMode) {
    return (
      <div className="app">
        <main className="app__body">
          <AdminPanel onExit={() => setAdminMode(false)} />
        </main>
      </div>
    );
  }

  // Обязательный вход: пока анкета не готова (правила + фото + имя/возраст/пол),
  // показываем ТОЛЬКО экран онбординга — ни ленты, ни навигации.
  if (me && !me.onboarded) {
    return (
      <Onboarding
        onDone={(profile) => setMe(profile)}
        onAdminUnlock={() => setAdminMode(true)}
      />
    );
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
            onBlockOrReport={refreshAfterBlock}
            myInterests={me?.interests || []}
            hasLocation={!!me?.hasLocation}
            onShareLocation={handleShareLocation}
            onClearLocation={handleClearLocation}
            likesLeft={me?.likesLeft}
            superlikesLeft={me?.superlikesLeft}
            isPremium={!!me?.isPremium}
            onOpenPremium={goToPremium}
          />
        )}
        {tab === 'likes' && (
          <LikesScreen
            people={incoming}
            isPremium={!!me?.isPremium}
            onLike={(p) => handleIncomingDecision(p, 'like')}
            onPass={(p) => handleIncomingDecision(p, 'pass')}
            onBrowse={() => setTab('deck')}
            onUpgrade={goToPremium}
          />
        )}
        {tab === 'chat' && (
          <ChatTab
            matches={matches}
            superlikes={superlikes}
            superlikeBusyId={superlikeBusyId}
            messages={messages}
            activities={activities}
            myProfile={me}
            activeChat={activeChat}
            activeChatId={activeChatId}
            partnerReadAt={activeMatch?.partnerReadAt}
            onSelectChat={setActiveChatId}
            onBrowse={() => setTab('deck')}
            onReciprocateSuperlike={handleReciprocateSuperlike}
            onPassSuperlike={handlePassSuperlike}
            onSend={handleSend}
            onReact={handleReact}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onTyping={handleTyping}
            onLeftChat={handleLeftChat}
          />
        )}
        {tab === 'me' && renderProfileTab()}
      </main>

      <BottomNav
        active={tab}
        chatBadge={totalUnread}
        onChange={(t) => {
          // повторный тап по «Чат» из открытой переписки — назад к списку
          if (t === 'chat' && tab === 'chat') setActiveChatId(null);
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

      <MissedLikeNudge
        show={showMissedLikeNudge}
        onDismiss={dismissMissedLikeNudge}
        onUpgrade={upgradeFromMissedLikeNudge}
      />
    </div>
  );
}
