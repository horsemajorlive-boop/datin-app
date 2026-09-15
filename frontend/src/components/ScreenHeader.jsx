import { useAdminGesture } from '../lib/adminGesture';

// Единая шапка экрана-вкладки: заголовок слева (+ необязательный счётчик),
// одно место под действие справа.
//
// Props:
//   title          — заголовок
//   count          — число рядом с заголовком (необязательно)
//   children       — что показать справа (обычно <button className="scrhead__btn">)
//   onAdminUnlock  — необязательно: включает секретный жест на логотипе
//                    (7 тапов + кодовая фраза, см. ../lib/adminGesture).
//                    Передаётся только с экрана профиля — на остальных
//                    экранах логотип остаётся чисто декоративным.
//                    В отличие от сердечка онбординга (AdminGate) — вообще
//                    без анимации, тап никак визуально не отмечается.

const MARK = (
  <>
    <svg viewBox="0 0 200 200" width="22" height="22">
      <defs>
        <linearGradient id="scrheadMarkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0d9a0" />
          <stop offset="1" stopColor="#d8687a" />
        </linearGradient>
      </defs>
      <path
        d="M132,100 A38,38 0 1,0 78,132 A28,28 0 1,1 132,100 Z"
        fill="url(#scrheadMarkGrad)"
      />
      <path
        d="M142,60 C144,65 148,68 153,69 C148,70 144,73 142,78 C140,73 136,70 131,69 C136,68 140,65 142,60 Z"
        fill="#e3b567"
      />
    </svg>
    <span className="scrhead__markword">TIAMO</span>
  </>
);

export default function ScreenHeader({ title, count, children, onAdminUnlock }) {
  const { listening, inputRef, registerTap, handleCodeInput } =
    useAdminGesture(onAdminUnlock);

  return (
    <header className="scrhead">
      <h1 className="scrhead__title">
        <span className="scrhead__titletext">{title}</span>
        {count != null && <span className="scrhead__count">{count}</span>}
      </h1>
      {onAdminUnlock ? (
        <div className="scrhead__mark">
          <button
            type="button"
            className="scrhead__markbtn"
            onClick={registerTap}
            aria-label="TiAmo"
          >
            {MARK}
          </button>
          {listening && (
            <input
              ref={inputRef}
              type="password"
              className="scrhead__markcode"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={handleCodeInput}
            />
          )}
        </div>
      ) : (
        <div className="scrhead__mark" aria-hidden="true">
          {MARK}
        </div>
      )}
      {children && <div className="scrhead__actions">{children}</div>}
    </header>
  );
}
