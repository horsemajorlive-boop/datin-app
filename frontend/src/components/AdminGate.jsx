import { useRef, useState } from 'react';
import { api } from '../api';
import { IconHeart } from './icons';

// Секретная дверь в режим админа — прячется в декоративном сердечке на
// приветственном экране входа. Каждый тап — просто вылетающее сердечко,
// красиво и ничего не значит. Но если тапнуть 7 раз подряд (не слишком
// медленно) и затем набрать кодовую фразу, включается вход в админку.
//
// Никакой видимой реакции на сам жест или на неверный код нет и не должно
// быть — ни подсказок, ни "нет доступа". Тапай сколько хочешь, набирай на
// клавиатуре что хочешь — снаружи не видно вообще ничего. И даже угаданная
// фраза не открывает панель сама по себе: она лишь запускает тихую проверку
// на сервере (users.is_admin для настоящего Telegram-аккаунта); если это
// не админ — просто ничего не происходит.
//
// Props:
//   onUnlock — фраза угадана И сервер подтвердил права — открыть режим админа

const TAPS_NEEDED = 7;
const TAP_WINDOW_MS = 2500; // тапы порознь дальше этого — счётчик сбрасывается
const LISTEN_MS = 15000; // сколько ждём кодовую фразу после 7-го тапа
const CODE = 'admin07012000admin';

export default function AdminGate({ onUnlock }) {
  const [bursts, setBursts] = useState([]);
  const [listening, setListening] = useState(false);
  const tapTimes = useRef([]);
  const burstSeq = useRef(0);
  const hideTimer = useRef(null);
  const inputRef = useRef(null);

  function spawnHeart() {
    const id = burstSeq.current++;
    setBursts((b) => [...b, id]);
    setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 900);
  }

  function handleTap() {
    spawnHeart();

    const nowTs = Date.now();
    const recent = [...tapTimes.current, nowTs].filter(
      (t) => nowTs - t < TAP_WINDOW_MS
    );
    tapTimes.current = recent;

    if (recent.length >= TAPS_NEEDED) {
      tapTimes.current = [];
      setListening(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setListening(false), LISTEN_MS);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }

  async function handleCodeInput(e) {
    if (e.target.value !== CODE) return;
    clearTimeout(hideTimer.current);
    setListening(false);
    e.target.value = '';

    // Тихая проверка на сервере. Ошиблись местом/аккаунтом — молчим.
    try {
      const me = await api.get('/me');
      if (me.isAdmin) onUnlock?.();
    } catch {
      /* ничего не показываем */
    }
  }

  return (
    <div className="onb__logo admgate">
      <button
        type="button"
        className="admgate__btn"
        onClick={handleTap}
        aria-label="Знакомства"
      >
        <IconHeart filled />
        {bursts.map((id) => (
          <span
            key={id}
            className="admgate__fly"
            style={{ '--dx': `${Math.round((Math.random() - 0.5) * 56)}px` }}
          >
            💗
          </span>
        ))}
      </button>

      {listening && (
        <input
          ref={inputRef}
          type="password"
          className="admgate__code"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={handleCodeInput}
        />
      )}
    </div>
  );
}
