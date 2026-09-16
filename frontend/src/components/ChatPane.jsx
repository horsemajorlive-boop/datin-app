import { useEffect, useMemo, useRef, useState } from 'react';
import WingmanBar from './WingmanBar';
import DatePlanner from './DatePlanner';
import EmojiPicker from './EmojiPicker';
import VerifiedBadge from './VerifiedBadge';
import ReportSheet from './ReportSheet';
import { getSuggestions } from '../lib/wingman';
import { fileToCompressedDataUrl } from '../lib/image';
import { formatLastSeen } from '../lib/relativeTime';
import { api } from '../api';
import {
  IconCalendar,
  IconSparkles,
  IconSmile,
  IconImage,
  IconSend,
  IconMore,
  IconChevronLeft,
  IconEdit,
  IconTrash,
  IconX,
  IconCheck,
} from './icons';

// Правая часть вкладки "Чат" — сама переписка.
//
// Меню действий у сообщения (реакции + для своих — изменить/удалить)
// открывается НЕ обычным тапом — так его слишком легко случайно задеть
// и слишком легко не заметить: наведением мыши на кнопку "⋯" (десктоп),
// долгим нажатием прямо по сообщению (мобильные) или правым кликом.
// Само меню подвешивается рядом с конкретным сообщением (getBoundingClientRect
// в openMenu), а не в фиксированном месте экрана.
//
// Props:
//   match     — анкета собеседника (+ online, lastSeen, gender)
//   matchId   — id мэтча (для жалобы/разматчивания)
//   messages  — массив сообщений: [{ id, from, ts, type, text?, photo?, reaction?, editedAt?, deleted? }]
//   myProfile — своя анкета (нужна помощнику для общих интересов)
//   activity  — что делает собеседник сейчас: 'typing' | 'emoji' | 'photo' | undefined
//   partnerReadAt — до какого момента собеседник прочитал чат (для "Прочитано"
//                   под своим последним сообщением)
//   onSend    — отправить сообщение: onSend({ type, text?, photo? })
//   onReact   — поставить/снять реакцию: onReact(messageId, emoji)
//   onEditMessage   — отредактировать своё сообщение: onEditMessage(messageId, text)
//   onDeleteMessage — удалить своё сообщение: onDeleteMessage(messageId)
//   onTyping  — сообщить собеседнику "я печатаю": onTyping(kind)
//   onLeftChat — вызывается и после жалобы/блокировки, и после разматчивания —
//                родителю в обоих случаях нужно закрыть чат и обновить списки

const REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

const ACTIVITY_LABEL = {
  typing: 'печатает…',
  emoji: 'выбирает эмодзи…',
  photo: 'выбирает фото…',
};

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Есть ли в строке буквы или цифры (значит это текст, а не «чистый» эмодзи).
function hasWords(str) {
  return /[0-9a-zA-Zа-яА-ЯёЁ]/.test(str);
}

export default function ChatPane({
  match,
  matchId,
  messages,
  myProfile,
  activity,
  partnerReadAt,
  onBack,
  onSend,
  onReact,
  onEditMessage,
  onDeleteMessage,
  onTyping,
  onLeftChat,
}) {
  const [text, setText] = useState('');
  const [showWingman, setShowWingman] = useState(true);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSocialMenu, setShowSocialMenu] = useState(false);
  const [showSocialHint, setShowSocialHint] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showUnmatch, setShowUnmatch] = useState(false);
  const [unmatching, setUnmatching] = useState(false);
  const [pickerFor, setPickerFor] = useState(null); // id сообщения с открытым меню (реакции/правка)
  const [pickerPos, setPickerPos] = useState(null); // { top, left, openUp } — куда его подвесить
  const [editingId, setEditingId] = useState(null); // id сообщения, которое сейчас редактируем
  const [, forceTick] = useState(0); // чтобы "был в сети N назад" обновлялся сам
  const bodyRef = useRef(null);
  const fileRef = useRef(null);
  const msgRefs = useRef({}); // id сообщения -> DOM-узел, чтобы подвесить меню рядом
  const pressTimer = useRef(null); // таймер долгого нажатия (мобильные)

  // Прокрутка ленты вниз при новом сообщении или смене статуса.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activity]);

  // Раз в 30 сек перерисовываем шапку — чтобы относительное время шло.
  useEffect(() => {
    const iv = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  // Подсказка про кнопку "@" — один раз в жизни приложения (не при каждом
  // входе в чат, иначе быстро надоест), исчезает сама через несколько секунд.
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem('chat-social-hint-seen') === '1';
    } catch {
      /* приватный режим и т.п. — просто не покажем подсказку */
    }
    if (seen) return;
    setShowSocialHint(true);
    const timer = setTimeout(() => setShowSocialHint(false), 5000);
    try {
      localStorage.setItem('chat-social-hint-seen', '1');
    } catch {
      /* не критично */
    }
    return () => clearTimeout(timer);
  }, []);

  const suggestions = useMemo(
    () => getSuggestions({ myProfile, match, messages }),
    [myProfile, match, messages]
  );

  function handleSubmit(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    if (editingId != null) {
      onEditMessage(editingId, value);
      setEditingId(null);
      setText('');
      return;
    }
    // если в сообщении нет букв/цифр — считаем его «эмодзи-сообщением» (крупнее)
    onSend({ type: hasWords(value) ? 'text' : 'emoji', text: value });
    setText('');
    setShowEmoji(false);
  }

  // Меню действий (реакции + изменить/удалить) — раньше висело в фиксированном
  // месте вверху экрана независимо от того, какое сообщение тронули, из-за
  // чего в длинной переписке казалось, что тап вообще ничего не делает.
  // Теперь подвешиваем его прямо у нужного сообщения (через getBoundingClientRect).
  function openMenu(m) {
    if (m.deleted) return;
    clearTimeout(pressTimer.current);
    const el = msgRefs.current[m.id];
    if (el) {
      const r = el.getBoundingClientRect();
      const openUp = r.top > 180; // сверху достаточно места — открываем вверх
      setPickerPos({
        left: Math.min(Math.max(r.left, 8), window.innerWidth - 8),
        top: openUp ? r.top : r.bottom,
        openUp,
      });
    } else {
      setPickerPos(null);
    }
    setPickerFor(m.id);
  }

  function closeMenu() {
    setPickerFor(null);
    setPickerPos(null);
  }

  // Долгое нажатие (мобильные) — держим 480мс, отменяем при уходе/движении пальца.
  function handlePressStart(m) {
    if (m.deleted) return;
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => openMenu(m), 480);
  }
  function handlePressEnd() {
    clearTimeout(pressTimer.current);
  }

  function startEdit(m) {
    setEditingId(m.id);
    setText(m.text || '');
    closeMenu();
    setShowPlanner(false);
    setShowEmoji(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setText('');
  }

  function handleDelete(m) {
    closeMenu();
    if (editingId === m.id) cancelEdit();
    onDeleteMessage(m.id);
  }

  // Поделиться своей соцсетью прямо в чат — отдельно от видимости ника в
  // карточке анкеты (там это по желанию скрыто/показано всем в поиске,
  // здесь — осознанная отправка конкретному собеседнику).
  function sendSocial(text) {
    setShowSocialMenu(false);
    onSend({ type: 'text', text });
  }

  const hasAnySocial = !!(myProfile?.telegram || myProfile?.instagram || myProfile?.vk);

  async function confirmUnmatch() {
    setUnmatching(true);
    try {
      await api.post(`/matches/${matchId}/unmatch`);
      setShowUnmatch(false);
      onLeftChat?.();
    } catch (err) {
      console.error('не удалось разматчиться', err);
      setUnmatching(false);
    }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // сброс, чтобы можно было выбрать тот же файл снова
    if (!file) return;
    try {
      // 1. сжимаем на клиенте, 2. грузим на сервер, 3. шлём сообщение со ссылкой
      const dataUrl = await fileToCompressedDataUrl(file);
      const { url } = await api.post('/upload', { dataUrl });
      onSend({ type: 'photo', photo: url });
    } catch (err) {
      console.error('не удалось отправить фото', err);
    }
  }

  // Статус в шапке: активность важнее, чем «в сети / был в сети».
  const statusText = activity
    ? ACTIVITY_LABEL[activity]
    : match.online
      ? 'в сети'
      : formatLastSeen(match.lastSeen, match.gender);

  const statusClass =
    'chat__status' +
    (activity ? ' is-activity' : match.online ? ' is-online' : '');

  return (
    <div className="chatpane">
      <header className="chat__header">
        {onBack && (
          <button
            type="button"
            className="chat__back"
            onClick={onBack}
            aria-label="К списку"
          >
            <IconChevronLeft />
          </button>
        )}
        <div className="chat__peer">
          <span className="chat__avatar-wrap">
            <img src={match.photos[0]} alt={match.name} />
            {match.online && <span className="chat__online-dot" />}
          </span>
          <span className="chat__peer-text">
            <span className="chat__name">
              {match.name}
              {match.verified && <VerifiedBadge />}
            </span>
            <span className={statusClass}>{statusText}</span>
          </span>
        </div>

        <div className="chat__tools">
          <div className="chat__menu-wrap">
            <button
              type="button"
              className={`chat__tool ${showSocialMenu ? 'is-on' : ''}`}
              onClick={() => {
                setShowSocialMenu((v) => !v);
                setShowSocialHint(false); // не загораживает только что открытое меню
              }}
              aria-label="Поделиться соцсетями"
            >
              <span className="chat__at">@</span>
            </button>

            {showSocialHint && (
              <div className="chat__social-hint">
                <span className="chat__social-hint-arrow" />
                Здесь можно поделиться своим Telegram, Instagram или VK
              </div>
            )}

            {showSocialMenu && (
              <>
                <div
                  className="chat__menu-bg"
                  onClick={() => setShowSocialMenu(false)}
                />
                <div className="chat__menu">
                  {hasAnySocial ? (
                    <>
                      {myProfile?.telegram && (
                        <button
                          type="button"
                          onClick={() => sendSocial(`Мой Telegram: @${myProfile.telegram}`)}
                        >
                          Отправить ник в Telegram
                        </button>
                      )}
                      {myProfile?.instagram && (
                        <button
                          type="button"
                          onClick={() => sendSocial(`Мой Instagram: @${myProfile.instagram}`)}
                        >
                          Отправить свою Инсту
                        </button>
                      )}
                      {myProfile?.vk && (
                        <button
                          type="button"
                          onClick={() => sendSocial(`Мой профиль VK: ${myProfile.vk}`)}
                        >
                          Отправить свой профиль в ВК
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="chat__menu-empty">
                      Добавьте соцсети в редактировании анкеты
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className={`chat__tool ${showPlanner ? 'is-on' : ''}`}
            onClick={() => {
              setShowPlanner((v) => !v);
              setShowEmoji(false);
            }}
            aria-label="Спланировать встречу"
          >
            <IconCalendar />
          </button>
          <button
            type="button"
            className={`chat__tool ${showWingman ? 'is-on' : ''}`}
            onClick={() => setShowWingman((v) => !v)}
            aria-label="Подсказки"
          >
            <IconSparkles />
          </button>
          <div className="chat__menu-wrap">
            <button
              type="button"
              className={`chat__tool ${showMenu ? 'is-on' : ''}`}
              onClick={() => setShowMenu((v) => !v)}
              aria-label="Ещё"
            >
              <IconMore />
            </button>
            {showMenu && (
              <>
                <div
                  className="chat__menu-bg"
                  onClick={() => setShowMenu(false)}
                />
                <div className="chat__menu">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowUnmatch(true);
                    }}
                  >
                    Разматчиться
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowReport(true);
                    }}
                  >
                    Пожаловаться
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {showReport && (
        <ReportSheet
          user={{ id: match.id, name: match.name }}
          onClose={() => setShowReport(false)}
          onDone={() => {
            setShowReport(false);
            onLeftChat?.();
          }}
        />
      )}

      {showUnmatch && (
        <div className="sheet" onClick={() => !unmatching && setShowUnmatch(false)}>
          <div className="sheet__card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet__body">
              <h2>Разматчиться с {match.name}?</h2>
              <p className="muted report__hint">
                Мэтч и переписка удалятся у вас обоих. Это не блокировка и не
                жалоба — если снова лайкнёте друг друга, сможете
                переписываться заново.
              </p>
              <button
                className="btn-wide btn-wide--danger-solid"
                disabled={unmatching}
                onClick={confirmUnmatch}
              >
                {unmatching ? 'Разматчиваем…' : 'Разматчиться'}
              </button>
              <button
                className="btn-wide btn-wide--ghost"
                disabled={unmatching}
                onClick={() => setShowUnmatch(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="chat__body"
        ref={bodyRef}
        onScroll={() => pickerFor && closeMenu()}
      >
        {messages.length === 0 && !activity ? (
          <div className="chat__empty">
            <p className="chat__empty-title">Вы понравились друг другу</p>
            <p className="chat__empty-sub">
              Начните разговор первым — так интереснее
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isLastMine = m.from === 'me' && i === messages.length - 1;
            const isRead = isLastMine && !!partnerReadAt && m.ts <= partnerReadAt;
            return (
              <div
                key={m.id}
                ref={(el) => {
                  if (el) msgRefs.current[m.id] = el;
                  else delete msgRefs.current[m.id];
                }}
                className={
                  'chat__msg ' +
                  (m.from === 'me' ? 'chat__msg--me' : 'chat__msg--them') +
                  (m.type && m.type !== 'text' && !m.deleted ? ' chat__msg--bare' : '') +
                  (pickerFor === m.id ? ' is-picking' : '') +
                  (m.deleted ? ' chat__msg--deleted' : '')
                }
                onContextMenu={(e) => {
                  if (m.deleted) return;
                  e.preventDefault();
                  openMenu(m);
                }}
                onTouchStart={() => handlePressStart(m)}
                onTouchEnd={handlePressEnd}
                onTouchMove={handlePressEnd}
                onTouchCancel={handlePressEnd}
              >
                {m.deleted ? (
                  <span className="chat__text chat__text--deleted">
                    Сообщение удалено
                  </span>
                ) : m.type === 'photo' ? (
                  <img className="chat__photo" src={m.photo} alt="фото" />
                ) : (
                  <span
                    className={m.type === 'emoji' ? 'chat__bigemoji' : 'chat__text'}
                  >
                    {m.text}
                  </span>
                )}
                <span className="chat__time">
                  {formatTime(m.ts)}
                  {m.editedAt && !m.deleted && ' · изменено'}
                  {isRead && ' · Прочитано'}
                </span>
                {m.reaction && !m.deleted && (
                  <span className="chat__reaction">{m.reaction}</span>
                )}
                {/* Наведение (десктоп) или долгое нажатие/тап по этой кнопке
                    (мобильные) открывают меню реакций и правки прямо здесь. */}
                {!m.deleted && (
                  <button
                    type="button"
                    className="chat__msgmenu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMenu(m);
                    }}
                    aria-label="Действия с сообщением"
                  >
                    <IconMore />
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* Индикатор "печатает" в ленте */}
        {activity && (
          <div className="chat__msg chat__msg--them chat__typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      {editingId != null && (
        <div className="chat__editbar">
          <IconEdit />
          <span>Редактирование сообщения</span>
          <button
            type="button"
            className="chat__editbar-cancel"
            onClick={cancelEdit}
            aria-label="Отменить редактирование"
          >
            <IconX />
          </button>
        </div>
      )}

      {showPlanner ? (
        <DatePlanner
          onCancel={() => setShowPlanner(false)}
          onCompose={(msg) => {
            setText(msg);
            setShowPlanner(false);
          }}
        />
      ) : showEmoji ? (
        <EmojiPicker onPick={(emoji) => setText((t) => t + emoji)} />
      ) : (
        !editingId &&
        showWingman && <WingmanBar suggestions={suggestions} onPick={setText} />
      )}

      <form className="chat__inputbar" onSubmit={handleSubmit}>
        <div className="chat__field">
          <button
            type="button"
            className="chat__inbtn"
            onClick={() => {
              setShowEmoji((v) => !v);
              setShowPlanner(false);
            }}
            aria-label="Эмодзи"
          >
            <IconSmile />
          </button>
          <input
            className="chat__input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value) onTyping?.('typing');
            }}
            placeholder="Сообщение"
            maxLength={500}
          />
          <button
            type="button"
            className="chat__inbtn"
            onClick={() => fileRef.current?.click()}
            aria-label="Отправить фото"
          >
            <IconImage />
          </button>
        </div>
        <button
          className="chat__send"
          type="submit"
          disabled={!text.trim()}
          aria-label={editingId != null ? 'Сохранить' : 'Отправить'}
        >
          {editingId != null ? <IconCheck /> : <IconSend />}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handlePhoto}
        />
      </form>

      {pickerFor &&
        pickerPos &&
        (() => {
          const pickedMsg = messages.find((m) => m.id === pickerFor);
          if (!pickedMsg) return null;
          const isMine = pickedMsg.from === 'me';
          const style = {
            left: pickerPos.left,
            ...(pickerPos.openUp
              ? { bottom: window.innerHeight - pickerPos.top + 8 }
              : { top: pickerPos.top + 8 }),
          };
          return (
            <>
              <div className="chat__pickerbg" onClick={closeMenu} />
              <div className="chat__ctxmenu" style={style}>
                <div
                  className={`chat__ctxmenu-reactions ${isMine ? 'has-actions' : ''}`}
                >
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="chat__pickbtn"
                      onClick={() => {
                        onReact(pickerFor, emoji);
                        closeMenu();
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {isMine && (
                  <div className="chat__ctxmenu-actions">
                    {pickedMsg.type === 'text' && (
                      <button
                        type="button"
                        className="chat__ctxmenu-item"
                        onClick={() => startEdit(pickedMsg)}
                      >
                        <IconEdit /> Изменить
                      </button>
                    )}
                    <button
                      type="button"
                      className="chat__ctxmenu-item chat__ctxmenu-item--danger"
                      onClick={() => handleDelete(pickedMsg)}
                    >
                      <IconTrash /> Удалить
                    </button>
                  </div>
                )}
              </div>
            </>
          );
        })()}
    </div>
  );
}
