import { useState } from 'react';
import PhotoCarousel from './PhotoCarousel';
import InterestChips from './InterestChips';
import LifestyleChips from './LifestyleChips';
import HealthChips from './HealthChips';
import GoalChips from './GoalChips';
import VerifiedBadge from './VerifiedBadge';
import ReportSheet from './ReportSheet';
import PromptCards from './PromptCards';
import { IconX } from './icons';
import { useCarousel } from '../lib/useCarousel';
import { cityWithDistance } from '../lib/location';

// Всплывающее окно ("шторка") с полной анкетой.
//
// Props:
//   profile     — какую анкету показать (или null — тогда ничего не рисуем)
//   myInterests — интересы текущего пользователя (для блока совместимости)
//   onClose     — закрыть окно
//   onResolved  — вызвать после жалобы/блокировки (родитель обновит ленту)

export default function ProfileSheet({
  profile,
  myInterests = [],
  onClose,
  onResolved,
}) {
  // Хук вызываем ВСЕГДА и до любого return — таково правило хуков в React.
  const photo = useCarousel(profile?.photos.length ?? 0);
  const [showReport, setShowReport] = useState(false);

  if (!profile) return null;

  const hasGoals = profile.goal || profile.kids;
  const hasLifestyle =
    profile.housing || profile.car || profile.employment ||
    profile.height || profile.weight || profile.smoking || profile.drinking;

  // Совместимость по интересам.
  const theirs = profile.interests || [];
  const mineSet = new Set(myInterests.map((i) => i.toLowerCase()));
  const common = theirs.filter((i) => mineSet.has(i.toLowerCase()));
  // коэффициент Дайса: насколько пересекаются два набора интересов
  const total = myInterests.length + theirs.length;
  const matchPct =
    total > 0 ? Math.round((2 * common.length * 100) / total) : 0;

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
          {(profile.city || profile.distanceKm != null) && (
            <p className="sheet__city">{cityWithDistance(profile.city, profile.distanceKm)}</p>
          )}
          {profile.bio && <p className="sheet__bio">{profile.bio}</p>}
          {profile.prompts?.length > 0 && <PromptCards prompts={profile.prompts} />}

          {hasGoals && (
            <section className="sheet__section">
              <h3>Ищет</h3>
              <GoalChips profile={profile} />
            </section>
          )}

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

          {common.length > 0 && (
            <section className="sheet__match">
              <div className="sheet__match-top">
                <span>Совпадение интересов</span>
                <b>{matchPct}%</b>
              </div>
              <p className="sheet__match-sub">
                {common.length === 1
                  ? 'Один общий интерес'
                  : `Общих интересов: ${common.length}`}{' '}
                — {common.join(', ')}
              </p>
              <div className="sheet__match-bar">
                <span style={{ width: `${Math.max(matchPct, 4)}%` }} />
              </div>
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
