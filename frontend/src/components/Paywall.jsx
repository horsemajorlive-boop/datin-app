import { IconLock } from './icons';

// Общий пейволл — экран блюрится, поверх карточка с предложением Premium.
// Открывается по клику на ЛЮБУЮ заблокированную Premium-функцию (сортировки
// и фильтры "Ещё" в FilterSheet и т.п.), а не только там, где раньше уже
// был отдельный, специфичный под контекст paywall-hint (лимиты лайков).
//
// Props:
//   show      — показывать ли прямо сейчас
//   text      — что именно недоступно без Premium (необязательно, есть дефолт)
//   onClose   — закрыть без перехода
//   onUpgrade — перейти к оформлению Premium

export default function Paywall({ show, text, onClose, onUpgrade }) {
  if (!show) return null;

  return (
    <div className="paywall-modal" onClick={onClose}>
      <div className="paywall-modal__card" onClick={(e) => e.stopPropagation()}>
        <span className="paywall-modal__icon">
          <IconLock />
        </span>
        <h2>Доступно с Premium</h2>
        <p>{text || 'Эта функция открывается вместе с TiAmo Premium.'}</p>
        <button type="button" className="btn-wide" onClick={onUpgrade}>
          Оформить Premium
        </button>
        <button type="button" className="btn-wide btn-wide--ghost" onClick={onClose}>
          Не сейчас
        </button>
      </div>
    </div>
  );
}
