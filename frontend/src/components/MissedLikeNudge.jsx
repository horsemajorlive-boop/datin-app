import { IconChevronDown } from './icons';

// Ненавязчивое напоминание про Premium — всплывает через случайное число
// свайпов (3–6) ПОСЛЕ того, как пользователь без Premium пропустил кого-то,
// кто уже его лайкнул (сам отсчёт — в App.jsx, см. handleSwipe). Специально
// не сразу: было бы слишком очевидно, кого именно только что пропустили.
//
// Props:
//   show      — показывать ли прямо сейчас
//   onDismiss — скрыть (стрелочка), не переходя никуда
//   onUpgrade — нажали на слово "Premium" — открыть оформление подписки

export default function MissedLikeNudge({ show, onDismiss, onUpgrade }) {
  if (!show) return null;

  return (
    <div className="missed-nudge" onClick={onDismiss}>
      <div className="missed-nudge__card" onClick={(e) => e.stopPropagation()}>
        <p className="missed-nudge__text">
          Ой, вы пропустили симпатию пару свайпов назад — с{' '}
          <button
            type="button"
            className="missed-nudge__premium"
            onClick={onUpgrade}
          >
            Premium
          </button>{' '}
          вы можете видеть, кому вы понравились!
        </p>
        <button
          type="button"
          className="missed-nudge__close"
          onClick={onDismiss}
          aria-label="Скрыть"
        >
          <IconChevronDown />
        </button>
      </div>
    </div>
  );
}
