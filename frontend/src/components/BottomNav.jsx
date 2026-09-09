// Нижняя панель навигации.
//
// Props:
//   active   — id активной вкладки ('deck' | 'likes' | 'matches' | 'chat' | 'me')
//   onChange — сменить вкладку

const TABS = [
  { id: 'deck', label: 'Поиск', icon: '🔥' },
  { id: 'likes', label: 'Симпатии', icon: '♥' },
  { id: 'matches', label: 'Мэтчи', icon: '💛' },
  { id: 'chat', label: 'Чат', icon: '💬' },
  { id: 'me', label: 'Профиль', icon: '👤' },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`nav__item ${active === tab.id ? 'is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="nav__icon">{tab.icon}</span>
          <span className="nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
