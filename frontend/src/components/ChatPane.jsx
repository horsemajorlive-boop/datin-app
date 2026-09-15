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
} from './icons';

// Правая часть вкладки "Чат" — сама переписка.
//
// Props:
//   match     — анкета собеседника (+ online, lastSeen, gender)
//   matchId   — id мэтча (для жалобы/разматчивания)
//   messages  — массив сообщений: [{ id, from, ts, type, text?, photo?, reaction? }]
//   myProfile — своя анкета (нужна помощнику для общих интересов)
//   activity  — что делает собеседник сейчас: 'typing' | 'emoji' | 'photo' | undefined
//   onSend    — отправить сообщение: onSend({ type, text?, photo? })
//   onReact   — поставить/снять реакцию: onReact(messageId, emoji)
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
  onBack,
  onSend,
  onReact,
  onTyping,
  onLeftChat,
}) {
  const [text, setText] = useState('');
  const [showWingman, setShowWingman] = useState(true);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showUnmatch, setShowUnmatch] = useState(false);
  const [unmatching, setUnmatching] = useState(false);
  const [pickerFor, setPickerFor] = useState(null); // id сообщения с открытым выбором реакции
  const [, forceTick] = useState(0); // чтобы "был в сети N назад" обновлялся сам
  const bodyRef = useRef(null);
  const fileRef = useRef(null);

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

  const suggestions = useMemo(
    () => getSuggestions({ myProfile, match, messages }),
    [myProfile, match, messages]
  );

  function handleSubmit(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    // если в сообщении нет букв/цифр — считаем его «эмодзи-сообщением» (крупнее)
    onSend({ type: hasWords(value) ? 'text' : 'emoji', text: value });
    setText('');
    setShowEmoji(false);
  }

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

      <div className="chat__body" ref={bodyRef}>
        {messages.length === 0 && !activity ? (
          <div className="chat__empty">
            <p className="chat__empty-title">Вы понравились друг другу</p>
            <p className="chat__empty-sub">
              Начните разговор первым — так интереснее
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                'chat__msg ' +
                (m.from === 'me' ? 'chat__msg--me' : 'chat__msg--them') +
                (m.type && m.type !== 'text' ? ' chat__msg--bare' : '') +
                (pickerFor === m.id ? ' is-picking' : '')
              }
              onClick={() =>
                setPickerFor((cur) => (cur === m.id ? null : m.id))
              }
            >
              {m.type === 'photo' ? (
                <img className="chat__photo" src={m.photo} alt="фото" />
              ) : (
                <span
                  className={m.type === 'emoji' ? 'chat__bigemoji' : 'chat__text'}
                >
                  {m.text}
                </span>
              )}
              <span className="chat__time">{formatTime(m.ts)}</span>
              {m.reaction && (
                <span className="chat__reaction">{m.reaction}</span>
              )}
            </div>
          ))
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
          aria-label="Отправить"
        >
          <IconSend />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handlePhoto}
        />
      </form>

      {pickerFor && (
        <>
          <div className="chat__pickerbg" onClick={() => setPickerFor(null)} />
          <div className="chat__picker">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="chat__pickbtn"
                onClick={() => {
                  onReact(pickerFor, emoji);
                  setPickerFor(null);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
