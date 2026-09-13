import { IconSearch, IconHeart, IconMessage, IconUser } from './icons';

// Нижняя панель навигации.
//
// Props:
//   active    — id активной вкладки ('deck' | 'likes' | 'chat' | 'me')
//   chatBadge — число непрочитанных сообщений (бейдж на вкладке «Чат»)
//   onChange  — сменить вкладку

const TABS = [
  { id: 'deck', label: 'Поиск', Icon: IconSearch },
  { id: 'likes', label: 'Симпатии', Icon: IconHeart },
  { id: 'chat', label: 'Чат', Icon: IconMessage },
  { id: 'me', label: 'Профиль', Icon: IconUser },
];

export default function BottomNav({ active, chatBadge = 0, onChange }) {
  return (
    <nav className="nav">
      <div className="nav__pill">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav__item ${active === id ? 'is-active' : ''}`}
            onClick={() => onChange(id)}
            aria-label={label}
          >
            <span className="nav__icon">
              <Icon />
              {id === 'chat' && chatBadge > 0 && (
                <span className="nav__badge">
                  {chatBadge > 9 ? '9+' : chatBadge}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
