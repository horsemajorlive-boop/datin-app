import { IconSearch, IconHeart, IconMessage, IconUser, IconUsers } from './icons';

// Нижняя панель навигации.
//
// Props:
//   active     — id активной вкладки ('deck' | 'likes' | 'chat' | 'groups' | 'me')
//   chatBadge  — число непрочитанных сообщений (бейдж на вкладке «Чат»)
//   groupsBadge — число непрочитанных сообщений в группах (бейдж на кнопке «Группы»)
//   onChange   — сменить вкладку

const TABS = [
  { id: 'deck', label: 'Поиск', Icon: IconSearch },
  { id: 'likes', label: 'Симпатии', Icon: IconHeart },
  { id: 'chat', label: 'Чат', Icon: IconMessage },
  { id: 'me', label: 'Профиль', Icon: IconUser },
];

export default function BottomNav({ active, chatBadge = 0, groupsBadge = 0, onChange }) {
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

      {/* Группы по интересам — отдельная кнопка, не в общей пилюле. */}
      <button
        className={`nav__groups ${active === 'groups' ? 'is-active' : ''}`}
        onClick={() => onChange('groups')}
        aria-label="Группы"
      >
        <IconUsers />
        {groupsBadge > 0 && (
          <span className="nav__badge nav__badge--groups">
            {groupsBadge > 9 ? '9+' : groupsBadge}
          </span>
        )}
      </button>
    </nav>
  );
}
