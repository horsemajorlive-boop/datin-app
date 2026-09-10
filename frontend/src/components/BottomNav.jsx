import { IconSearch, IconHeart, IconMessage, IconUser } from './icons';

// Нижняя панель навигации.
//
// Props:
//   active   — id активной вкладки ('deck' | 'likes' | 'chat' | 'me')
//   onChange — сменить вкладку

const TABS = [
  { id: 'deck', label: 'Поиск', Icon: IconSearch },
  { id: 'likes', label: 'Симпатии', Icon: IconHeart },
  { id: 'chat', label: 'Чат', Icon: IconMessage },
  { id: 'me', label: 'Профиль', Icon: IconUser },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`nav__item ${active === id ? 'is-active' : ''}`}
          onClick={() => onChange(id)}
        >
          <span className="nav__icon">
            <Icon />
          </span>
          <span className="nav__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
