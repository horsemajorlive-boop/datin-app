import { getCurrentUser } from '../telegram';
import PhotoCarousel from '../components/PhotoCarousel';
import InterestChips from '../components/InterestChips';
import LifestyleChips from '../components/LifestyleChips';
import { useCarousel } from '../lib/useCarousel';

// Экран "Профиль" — как выглядит анкета самого пользователя.
//
// Props:
//   profile — анкета пользователя (из App)
//   onEdit  — переключиться в режим редактирования

export default function MyProfileScreen({ profile, onEdit }) {
  // Хук — до любого return.
  const photo = useCarousel(profile.photos.length);
  const user = getCurrentUser();

  // Считаем анкету "пустой", если не заполнено имя.
  if (!profile.name) {
    return (
      <div className="screen">
        <h1 className="screen__title">Мой профиль</h1>
        <p className="muted">
          Анкета ещё не заполнена. Расскажите о себе — так вас будет видно другим.
        </p>
        <button className="btn-wide" onClick={onEdit}>
          Заполнить анкету
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="screen__title">Мой профиль</h1>

      <div className="card card--static">
        <PhotoCarousel
          photos={profile.photos}
          index={photo.index}
          alt={profile.name}
          onPrev={photo.prev}
          onNext={photo.next}
        />
        <div className="card__overlay" />
        <div className="card__info">
          <h2>
            {profile.name}, {profile.age}
          </h2>
          {profile.city && <p className="card__city">{profile.city}</p>}
          {profile.bio && <p className="card__bio">{profile.bio}</p>}
        </div>
      </div>

      <LifestyleChips profile={profile} />
      <InterestChips interests={profile.interests} />

      <button className="btn-wide" onClick={onEdit}>
        Редактировать
      </button>
    </div>
  );
}
