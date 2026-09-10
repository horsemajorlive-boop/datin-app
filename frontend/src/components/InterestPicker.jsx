import { useState } from 'react';
import { INTEREST_CATEGORIES, interestIconKey } from '../data/interests';
import { InterestIcon } from './interestIcons';

// Выбор интересов для редактора анкеты — по разделам.
//
// Props:
//   value    — массив выбранных интересов (строки)
//   onChange — вызвать с новым массивом

const MAX_INTERESTS = 10;

export default function InterestPicker({ value, onChange }) {
  const [text, setText] = useState('');

  const has = (name) => value.some((v) => v.toLowerCase() === name.toLowerCase());

  function add(raw) {
    const name = raw.trim();
    if (!name || value.length >= MAX_INTERESTS || has(name)) return;
    onChange([...value, name]);
    setText('');
  }

  function remove(name) {
    onChange(value.filter((v) => v !== name));
  }

  function toggle(name) {
    if (has(name)) remove(name);
    else add(name);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(text);
    }
    if (e.key === 'Backspace' && text === '' && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  const isFull = value.length >= MAX_INTERESTS;

  return (
    <div className="picker">
      {value.length > 0 && (
        <div className="picker__row">
          {value.map((name) => (
            <button
              type="button"
              key={name}
              className="ichip ichip--picked"
              onClick={() => remove(name)}
            >
              <InterestIcon iconKey={interestIconKey(name)} />
              {name}
              <span className="ichip__x">✕</span>
            </button>
          ))}
        </div>
      )}

      <input
        className="picker__input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={24}
        placeholder={isFull ? 'Достаточно интересов' : 'Свой вариант, затем Enter'}
        disabled={isFull}
      />

      <div className="picker__cats">
        {INTEREST_CATEGORIES.map((cat) => (
          <div className="picker__cat" key={cat.id}>
            <div className="picker__cat-head">
              <InterestIcon iconKey={cat.icon} />
              {cat.name}
            </div>
            <div className="picker__row">
              {cat.items.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`ichip ichip--add ${has(item) ? 'is-on' : ''}`}
                  onClick={() => toggle(item)}
                  disabled={isFull && !has(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="field__hint">
        {value.length}/{MAX_INTERESTS}
      </p>
    </div>
  );
}
