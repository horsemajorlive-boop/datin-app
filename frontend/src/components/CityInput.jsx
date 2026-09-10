import { useEffect, useRef, useState } from 'react';
import { RU_CITIES } from '../data/cities';

// Поле выбора города из списка.
// Ввод фильтрует подсказки; сохранить можно только вариант из списка
// (произвольный текст не принимается — иначе в анкетах будут "города из букв").
//
// Props:
//   value       — выбранный город ('' если не выбран)
//   onChange    — onChange(город | '')
//   placeholder

export default function CityInput({
  value,
  onChange,
  placeholder = 'Начните вводить',
}) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // держим поле в синхроне с внешним value
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // клик вне поля — закрыть подсказки и откатить несохранённый ввод
  useEffect(() => {
    function onDocMouseDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
        setQuery(value || '');
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [value]);

  const q = query.trim().toLowerCase();
  const matches = q
    ? RU_CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8)
    : [];

  function pick(city) {
    onChange(city);
    setQuery(city);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && matches[0]) {
      e.preventDefault();
      pick(matches[0]);
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery(value || '');
    }
  }

  return (
    <div className="cityinput" ref={boxRef}>
      <input
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {value && (
        <button
          type="button"
          className="cityinput__clear"
          aria-label="Очистить"
          onClick={() => {
            onChange('');
            setQuery('');
            setOpen(false);
          }}
        >
          ✕
        </button>
      )}

      {open && matches.length > 0 && (
        <ul className="cityinput__list">
          {matches.map((c) => (
            <li key={c}>
              <button type="button" onClick={() => pick(c)}>
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && q.length >= 2 && matches.length === 0 && (
        <ul className="cityinput__list">
          <li className="cityinput__empty">Такого города нет в списке</li>
        </ul>
      )}
    </div>
  );
}
