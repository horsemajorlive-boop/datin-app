import { useRef, useState } from 'react';
import { useAdminGesture } from '../lib/adminGesture';
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
// Тот же жест (и тот же код) без анимации есть и на логотипе в шапке
// профиля — см. useAdminGesture (../lib/adminGesture) и ScreenHeader.
//
// Props:
//   onUnlock — фраза угадана И сервер подтвердил права — открыть режим админа

export default function AdminGate({ onUnlock }) {
  const [bursts, setBursts] = useState([]);
  const burstSeq = useRef(0);
  const { listening, inputRef, registerTap, handleCodeInput } =
    useAdminGesture(onUnlock);

  function spawnHeart() {
    const id = burstSeq.current++;
    setBursts((b) => [...b, id]);
    setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 900);
  }

  function handleTap() {
    spawnHeart();
    registerTap();
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
