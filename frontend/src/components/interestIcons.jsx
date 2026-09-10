// Минималистичные линейные иконки для разделов интересов.
// Один компонент InterestIcon, ключ раздела передаётся в iconKey.

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const PATHS = {
  activity: <path d="M3 12h4l2.5-7 4 14 2.5-7H21" />,
  mountain: <path d="M3 19l6-11 3.5 6L16 9l5 10z" />,
  film: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M8 5v14M16 5v14" />
    </>
  ),
  cup: (
    <>
      <path d="M5 8h12v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" />
      <path d="M17 9h2a2 2 0 0 1 0 4h-2" />
      <path d="M7 3v2M11 3v2" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="9" cy="9" r="1.1" />
      <circle cx="15" cy="15" r="1.1" />
      <circle cx="15" cy="9" r="1.1" />
      <circle cx="9" cy="15" r="1.1" />
    </>
  ),
  code: <path d="M9 8l-4 4 4 4M15 8l4 4-4 4M13.5 6l-3 12" />,
  home: <path d="M4 11l8-7 8 7M6 10v9h12v-9" />,
  paw: (
    <>
      <circle cx="7" cy="9" r="1.6" />
      <circle cx="12" cy="7" r="1.6" />
      <circle cx="17" cy="9" r="1.6" />
      <path d="M12 12c-2.8 0-4.5 1.9-4.5 3.8A2.2 2.2 0 0 0 9.7 18h4.6a2.2 2.2 0 0 0 2.2-2.2C16.5 13.9 14.8 12 12 12z" />
    </>
  ),
  book: (
    <>
      <path d="M6 4h12a1 1 0 0 1 1 1v13H8a2 2 0 0 0-2 2z" />
      <path d="M6 18a2 2 0 0 1 2-2h11" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>
  ),
  glass: <path d="M5 5h14l-7 8zM12 13v6M8 19h8" />,
  shirt: <path d="M9 4l-5 3 2 3 2-1.2V20h8V8.8L17 10l2-3-5-3-2.5 2z" />,
  tag: (
    <>
      <path d="M20 13.5l-6.5 6.5-9.5-9.5V4h6.5z" />
      <circle cx="8" cy="8" r="1.1" />
    </>
  ),
};

export function InterestIcon({ iconKey = 'tag' }) {
  return <svg {...svgProps}>{PATHS[iconKey] || PATHS.tag}</svg>;
}
