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
  return (
    <div className="verify-row">
      <span>
        {profile.verificationStatus === 'rejected'
          ? 'Заявка отклонена. Можно отправить новое фото.'
          : 'Пройдите верификацию — получите золотую галочку.'}
      </span>
      <button className="btn-wide btn-wide--ghost" onClick={onVerify}>
        {profile.verificationStatus === 'rejected'
          ? 'Отправить заново'
          : 'Пройти верификацию'}
      </button>
    </div>
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
  // Хук — до любого return.
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

  // Считаем анкету "пустой", если не заполнено имя.
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
            {profile.name}, {profile.age}
            {profile.verified && <VerifiedBadge />}
          </h2>
          {profile.city && <p className="card__city">{profile.city}</p>}
          {profile.bio && <p className="card__bio">{profile.bio}</p>}
        </div>
      </div>

      <HealthChips profile={profile} />
      <LifestyleChips profile={profile} />
      <InterestChips interests={profile.interests} />

      <VerificationRow profile={profile} onVerify={onVerify} />

      <button className="btn-wide" onClick={onEdit}>
        Редактировать
      </button>

      {profile.isAdmin && (
        <>
          <button className="btn-wide btn-wide--ghost" onClick={onModerate}>
            Модерация верификаций
          </button>
          <button className="btn-wide btn-wide--ghost" onClick={onOpenReports}>
            Жалобы
          </button>
        </>
      )}
    </div>
  );
}
