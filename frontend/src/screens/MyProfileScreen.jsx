import PhotoCarousel from '../components/PhotoCarousel';
import InterestChips from '../components/InterestChips';
import LifestyleChips from '../components/LifestyleChips';
import HealthChips from '../components/HealthChips';
import GoalChips from '../components/GoalChips';
import VerifiedBadge from '../components/VerifiedBadge';
import ScreenHeader from '../components/ScreenHeader';
import ProfileStrength from '../components/ProfileStrength';
import PromptCards from '../components/PromptCards';
import { IconVerified, IconSettings } from '../components/icons';
import { useCarousel } from '../lib/useCarousel';

// Экран "Профиль" — как выглядит анкета самого пользователя.
//
// Props:
//   profile        — анкета пользователя (из App)
//   onEdit         — переключиться в режим редактирования
//   onVerify       — открыть экран верификации
//   onOpenSettings — открыть настройки
//
// Модерации здесь нет и не должно быть ни в каком виде — даже скрытой
// за проверкой isAdmin. Единственный вход в неё — секретный жест на
// сердечке онбординга (AdminGate/AdminPanel), см. App.jsx.

function VerificationRow({ profile, onVerify }) {
  if (profile.verified) {
    return (
      <div className="verify-row verify-row--ok">
        <IconVerified />
        <span>Профиль подтверждён</span>
      </div>
    );
  }
  if (profile.verificationStatus === 'pending') {
    return (
      <div className="verify-row">
        <span>Заявка на проверке — обычно до 24 часов</span>
      </div>
    );
  }
  const rejected = profile.verificationStatus === 'rejected';
  return (
    <button className="verify-row verify-row--btn" onClick={onVerify}>
      <IconVerified />
      <span>
        {rejected
          ? 'Заявка отклонена — можно отправить новое фото'
          : 'Пройдите верификацию и получите галочку'}
      </span>
      <span className="verify-row__cta">
        {rejected ? 'Отправить' : 'Пройти'}
      </span>
    </button>
  );
}

export default function MyProfileScreen({
  profile,
  onEdit,
  onVerify,
  onOpenSettings,
}) {
  const photo = useCarousel(profile.photos.length);

  const header = (
    <ScreenHeader title="Мой профиль">
      <button
        className="scrhead__btn"
        onClick={onOpenSettings}
        aria-label="Настройки"
      >
        <IconSettings />
      </button>
    </ScreenHeader>
  );

  if (!profile.name) {
    return (
      <div className="screen">
        {header}
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
      {header}

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
            <span className="card__name">
              {profile.name} <span className="card__age">{profile.age}</span>
            </span>
            {profile.verified && <VerifiedBadge />}
          </h2>
          {profile.city && <p className="card__city">{profile.city}</p>}
        </div>
      </div>

      <ProfileStrength profile={profile} onEdit={onEdit} />

      {profile.prompts?.length > 0 ? (
        <PromptCards prompts={profile.prompts} />
      ) : (
        profile.bio && <p className="myprofile__bio">{profile.bio}</p>
      )}

      {(profile.goal || profile.kids) && (
        <section className="sheet__section">
          <h3>Ищет</h3>
          <GoalChips profile={profile} />
        </section>
      )}

      <section className="sheet__section">
        <h3>О себе</h3>
        <HealthChips profile={profile} />
        <LifestyleChips profile={profile} />
      </section>

      {profile.interests?.length > 0 && (
        <section className="sheet__section">
          <h3>Интересы</h3>
          <InterestChips interests={profile.interests} />
        </section>
      )}

      <VerificationRow profile={profile} onVerify={onVerify} />

      <button className="btn-wide" onClick={onEdit}>
        Редактировать анкету
      </button>
    </div>
  );
}
