import { IconX } from './icons';

// Полноразмерный просмотр одной фотографии (долгое нажатие на фото в шапке
// чата) — поверх затемнённого и размытого фона. Тап мимо фото или на крестик
// закрывает окно.
//
// Props:
//   src     — ссылка на фото (или null/undefined — тогда ничего не рисуем)
//   alt     — текстовая подпись для доступности
//   onClose — закрыть окно

export default function PhotoLightbox({ src, alt, onClose }) {
  if (!src) return null;

  return (
    <div className="lightbox" onClick={onClose}>
      <button
        type="button"
        className="lightbox__close"
        onClick={onClose}
        aria-label="Закрыть"
      >
        <IconX />
      </button>
      <img
        className="lightbox__img"
        src={src}
        alt={alt}
        draggable="false"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
