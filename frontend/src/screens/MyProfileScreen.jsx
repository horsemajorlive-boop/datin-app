import PhotoCarousel from '../components/PhotoCarousel';
import InterestChips from '../components/InterestChips';
import LifestyleChips from '../components/LifestyleChips';
import HealthChips from '../components/HealthChips';
import VerifiedBadge from '../components/VerifiedBadge';
import { IconVerified, IconSettings } from '../components/icons';
import { useCarousel } from '../lib/useCarousel';

// Экран "Профиль" — как выглядит анкета самого пользователя.
//
// Props:
//   profile        — анкета пользователя (из App)
//   onEdit         — переключиться в режим редактирования
//   onVerify       — открыть экран верификации
//   onModerate     — открыть очередь модерации (только у админа)
//   onOpenReports  — открыть жалобы (только у админа)
//   onOpenSettings — открыть настройки

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
  onModerate,
  onOpenReports,
  onOpenSettings,
}) {
  const photo = useCarousel(profile.photos.length);

  const header = (
    <div className="screen__head">
      <h1 className="screen__title">Мой профиль</h1>
      <button
        className="screen__icon-btn"
        onClick={onOpenSettings}
        aria-label="Настройки"
      >
        <IconSettings />
      </button>
    </div>
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

      {profile.bio && <p className="myprofile__bio">{profile.bio}</p>}

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

      {profile.isAdmin && (
        <div className="plist">
          <div className="plist__head">Модерация</div>
          <button className="plist__row" onClick={onModerate}>
            <span>Верификации</span>
            <span className="plist__chev">›</span>
          </button>
          <button className="plist__row" onClick={onOpenReports}>
            <span>Жалобы</span>
            <span className="plist__chev">›</span>
          </button>
        </div>
      )}
    </div>
  );
}
