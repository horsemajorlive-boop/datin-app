import PhotoCarousel from './PhotoCarousel';
import InterestChips from './InterestChips';
import LifestyleChips from './LifestyleChips';
import { useCarousel } from '../lib/useCarousel';

// Всплывающее окно ("шторка") с полной анкетой.
//
// Props:
//   profile — какую анкету показать (или null — тогда ничего не рисуем)
//   onClose — закрыть окно

export default function ProfileSheet({ profile, onClose }) {
  // Хук вызываем ВСЕГДА и до любого return — таково правило хуков в React.
  // Если анкеты нет, длину считаем нулём.
  const photo = useCarousel(profile?.photos.length ?? 0);

  if (!profile) return null;

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__card" onClick={(e) => e.stopPropagation()}>
        {/* Контейнер с фиксированной высотой — внутри него листалка растягивается на всё */}
        <div className="sheet__media">
          <PhotoCarousel
            photos={profile.photos}
            index={photo.index}
            alt={profile.name}
            onPrev={photo.prev}
            onNext={photo.next}
          />
        </div>

        <div className="sheet__body">
          <h2>
            {profile.name}, {profile.age}
          </h2>
          <p className="muted">{profile.city}</p>
          <p>{profile.bio}</p>

          <LifestyleChips profile={profile} />
          <InterestChips interests={profile.interests} />

          <button className="btn-wide" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
