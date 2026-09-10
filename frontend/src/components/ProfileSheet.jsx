import { useState } from 'react';
import PhotoCarousel from './PhotoCarousel';
import InterestChips from './InterestChips';
import LifestyleChips from './LifestyleChips';
import HealthChips from './HealthChips';
import VerifiedBadge from './VerifiedBadge';
import ReportSheet from './ReportSheet';
import { IconX } from './icons';
import { useCarousel } from '../lib/useCarousel';

// Всплывающее окно ("шторка") с полной анкетой.
//
// Props:
//   profile    — какую анкету показать (или null — тогда ничего не рисуем)
//   onClose    — закрыть окно
//   onResolved — вызвать после жалобы/блокировки (родитель обновит ленту)

export default function ProfileSheet({ profile, onClose, onResolved }) {
  // Хук вызываем ВСЕГДА и до любого return — таково правило хуков в React.
  const photo = useCarousel(profile?.photos.length ?? 0);
  const [showReport, setShowReport] = useState(false);

  if (!profile) return null;

  const hasLifestyle =
    profile.housing || profile.car || profile.employment ||
    profile.height || profile.weight || profile.smoking || profile.drinking;

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__card" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__media">
          <PhotoCarousel
            photos={profile.photos}
            index={photo.index}
            alt={profile.name}
            onPrev={photo.prev}
            onNext={photo.next}
          />
          <button className="sheet__close" onClick={onClose} aria-label="Закрыть">
            <IconX />
          </button>
        </div>

        <div className="sheet__body">
          <h2 className="sheet__name">
            <span>
              {profile.name} <span className="sheet__age">{profile.age}</span>
            </span>
            {profile.verified && <VerifiedBadge />}
          </h2>
          {profile.city && <p className="sheet__city">{profile.city}</p>}
          {profile.bio && <p className="sheet__bio">{profile.bio}</p>}

          {hasLifestyle && (
            <section className="sheet__section">
              <h3>О себе</h3>
              <HealthChips profile={profile} />
              <LifestyleChips profile={profile} />
            </section>
          )}

          {profile.interests?.length > 0 && (
            <section className="sheet__section">
              <h3>Интересы</h3>
              <InterestChips interests={profile.interests} />
            </section>
          )}

          <button
            className="sheet__report"
            onClick={() => setShowReport(true)}
          >
            Пожаловаться
          </button>
        </div>
      </div>

      {showReport && (
        <ReportSheet
          user={{ id: profile.id, name: profile.name }}
          onClose={() => setShowReport(false)}
          onDone={() => {
            setShowReport(false);
            onResolved?.(profile.id);
          }}
        />
      )}
    </div>
  );
}
