import { useState } from 'react';
import { INTEREST_CATEGORIES } from '../data/interests';

const ALL_INTERESTS = INTEREST_CATEGORIES.flatMap((c) => c.items);

// Выбор ОДНОГО интереса из каталога через поиск — используется и в создании
// группы (обязательное поле — интерес тусовки), и в фильтре списка групп
// (там он необязателен, но компонент один и тот же).
//
// Props:
//   value       — выбранный интерес ('' если не выбран)
//   onChange    — onChange(интерес | '')
//   placeholder

export default function InterestSearchPicker({ value, onChange, placeholder = 'Начните вводить' }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = q ? ALL_INTERESTS.filter((i) => i.toLowerCase().includes(q)).slice(0, 8) : [];

  if (value) {
    return (
      <div className="choice">
        <button type="button" className="chipbtn is-on" onClick={() => onChange('')}>
          {value} ✕
        </button>
      </div>
    );
  }

  return (
    <div className="cityinput">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {matches.length > 0 && (
        <ul className="cityinput__list">
          {matches.map((i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onChange(i);
                  setQuery('');
                }}
              >
                {i}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
