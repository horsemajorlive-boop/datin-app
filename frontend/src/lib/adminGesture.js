import { useRef, useState } from 'react';
import { api } from '../api';

// Общая логика "секретного жеста" входа в админку: 7 тапов подряд (не
// медленнее чем раз в TAP_WINDOW_MS) открывают невидимое поле ввода кодовой
// фразы; фраза совпала — тихая проверка на сервере (users.is_admin для
// настоящего Telegram-аккаунта), не тот аккаунт — молчим.
//
// Используется в двух местах с одним и тем же кодом: на сердечке онбординга
// (AdminGate — с анимацией сердечек) и на логотипе в шапке профиля
// (ScreenHeader — вообще без какой-либо визуальной реакции на тап).
export const TAPS_NEEDED = 7;
const TAP_WINDOW_MS = 2500; // тапы порознь дальше этого — счётчик сбрасывается
const LISTEN_MS = 15000; // сколько ждём кодовую фразу после нужного тапа
const CODE = 'admin07012000admin';

export function useAdminGesture(onUnlock) {
  const [listening, setListening] = useState(false);
  const tapTimes = useRef([]);
  const hideTimer = useRef(null);
  const inputRef = useRef(null);

  function registerTap() {
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

    try {
      const me = await api.get('/me');
      if (me.isAdmin) onUnlock?.();
    } catch {
      /* ничего не показываем */
    }
  }

  return { listening, inputRef, registerTap, handleCodeInput };
}
