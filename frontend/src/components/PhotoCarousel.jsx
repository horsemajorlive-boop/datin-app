// Листалка фотографий (визуальная часть).
//
// Сама она НЕ хранит номер текущего фото — его передают снаружи через props.
// Так одну и ту же листалку можно использовать и в колоде (где переключение
// делает жест по карточке), и в обычной карточке (где для этого есть зоны тапа).
//
// Props:
//   photos          — массив ссылок/data-url картинок
//   index           — номер показываемого фото (управляется снаружи)
//   alt             — текстовая подпись для доступности
//   onPrev, onNext  — если переданы, рисуем невидимые кликабельные зоны слева/справа

export default function PhotoCarousel({
  photos = [],
  index = 0,
  alt = '',
  onPrev,
  onNext,
}) {
  if (photos.length === 0) return null;

  // Страховка: если index вдруг больше, чем есть фото, — прижимаем к границам.
  const safeIndex = Math.min(Math.max(index, 0), photos.length - 1);
  const showZones = onPrev && onNext && photos.length > 1;

  return (
    <div className="carousel">
      <img
        className="carousel__img"
        src={photos[safeIndex]}
        alt={alt}
        draggable="false"
      />

      {/* Полоски-индикаторы + счётчик сверху — только если фото больше одного. */}
      {photos.length > 1 && (
        <>
          <div className="carousel__bars">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`carousel__bar ${i === safeIndex ? 'is-active' : ''}`}
              />
            ))}
          </div>
          <span className="carousel__count">
            {safeIndex + 1} / {photos.length}
          </span>
        </>
      )}

      {showZones && (
        <>
          <button
            type="button"
            className="carousel__zone carousel__zone--left"
            aria-label="Предыдущее фото"
            onClick={onPrev}
          />
          <button
            type="button"
            className="carousel__zone carousel__zone--right"
            aria-label="Следующее фото"
            onClick={onNext}
          />
        </>
      )}
    </div>
  );
}
