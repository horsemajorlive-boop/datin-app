// Набор минималистичных линейных иконок (стиль Feather/Lucide).
// Все рисуются линией цвета currentColor — цвет задаёт родитель через CSS.

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function IconX() {
  return (
    <svg {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconHeart({ filled = false }) {
  // симметричный путь сердца (по мотивам Feather Icons)
  return (
    <svg {...base} fill={filled ? 'currentColor' : 'none'}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function IconRotateCcw() {
  return (
    <svg {...base}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

export function IconSearch() {
  return (
    <svg {...base}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function IconSparkles() {
  return (
    <svg {...base}>
      <path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8L12 3z" />
      <path d="M18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" />
    </svg>
  );
}

export function IconMessage() {
  return (
    <svg {...base}>
      <path d="M21 12a8 8 0 0 1-11.4 7.2L4 20l1-4.5A8 8 0 1 1 21 12z" />
    </svg>
  );
}

export function IconUser() {
  return (
    <svg {...base}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

export function IconSliders() {
  return (
    <svg {...base}>
      <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
      <circle cx="16" cy="8" r="2.2" />
      <circle cx="9" cy="16" r="2.2" />
    </svg>
  );
}

export function IconSend() {
  return (
    <svg {...base}>
      <path d="M22 3L11 14M22 3l-7 19-4-8-8-4 19-7z" />
    </svg>
  );
}

export function IconSmile() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </svg>
  );
}

export function IconImage() {
  return (
    <svg {...base}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M21 15l-5-5-9 9" />
    </svg>
  );
}

export function IconCalendar() {
  return (
    <svg {...base}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconChevronLeft() {
  return (
    <svg {...base}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
