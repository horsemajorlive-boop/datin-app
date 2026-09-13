// Тема оформления: режим (системная/светлая/тёмная) + акцентный цвет.
// Храним в localStorage, применяем к <html>:
//   - режим  -> атрибут data-theme (нет атрибута = системная)
//   - акцент -> инлайновые --accent / --accent-soft на :root

const KEY = 'app-theme';

export const THEMES = [
  { id: 'system', label: 'Системная' },
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Тёмная' },
];

export const ACCENTS = [
  { id: 'pink', label: 'Розовый', color: '#d8687a', soft: 'rgba(216, 104, 122, 0.18)' },
  { id: 'violet', label: 'Фиолетовый', color: '#8b5cf6', soft: 'rgba(139, 92, 246, 0.16)' },
  { id: 'blue', label: 'Синий', color: '#3b82f6', soft: 'rgba(59, 130, 246, 0.16)' },
  { id: 'green', label: 'Зелёный', color: '#10b981', soft: 'rgba(16, 185, 129, 0.16)' },
  { id: 'amber', label: 'Оранжевый', color: '#f59e0b', soft: 'rgba(245, 158, 11, 0.16)' },
  { id: 'red', label: 'Красный', color: '#ef4444', soft: 'rgba(239, 68, 68, 0.16)' },
];

const DEFAULTS = { mode: 'system', accent: 'pink' };

export function loadThemePrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveThemePrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* приватный режим — не критично */
  }
}

export function applyThemePrefs({ mode, accent }) {
  const root = document.documentElement;

  if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
  else root.removeAttribute('data-theme'); // системная

  const a = ACCENTS.find((x) => x.id === accent) || ACCENTS[0];
  root.style.setProperty('--accent', a.color);
  root.style.setProperty('--accent-soft', a.soft);
}
