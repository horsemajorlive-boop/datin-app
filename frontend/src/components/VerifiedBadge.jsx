import { IconVerified } from './icons';

// Золотая галочка рядом с именем подтверждённого пользователя.
export default function VerifiedBadge({ title = 'Фото подтверждено модератором' }) {
  return (
    <span className="vbadge" title={title} aria-label="Подтверждён">
      <IconVerified />
    </span>
  );
}
