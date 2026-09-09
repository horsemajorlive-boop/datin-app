import { useState } from 'react';
import { INTEREST_OPTIONS, interestEmoji } from '../data/interests';

// Выбор интересов для редактора анкеты.
//
// Это "управляемый" компонент: свой список он не хранит — получает его в props
// (value) и просит родителя обновить через onChange(следующийМассив).
//
// Props:
//   value    — массив выбранных интересов (строки)
//   onChange — вызвать с новым массивом

const MAX_INTERESTS = 8;

export default function InterestPicker({ value, onChange }) {
  const [text, setText] = useState(''); // что печатают в поле "свой вариант"

  // есть ли уже такой интерес (сравниваем без учёта регистра)
  function alreadyPicked(name) {
    return value.some((v) => v.toLowerCase() === name.toLowerCase());
  }

  function addInterest(raw) {
    const name = raw.trim();
    if (!name || value.length >= MAX_INTERESTS || alreadyPicked(name)) return;
    onChange([...value, name]);
    setText('');
  }

  function removeInterest(name) {
    onChange(value.filter((v) => v !== name));
  }

  function handleKeyDown(e) {
    // Enter или запятая — добавить напечатанное
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addInterest(text);
    }
    // Backspace на пустом поле — убрать последний выбранный
    if (e.key === 'Backspace' && text === '' && value.length > 0) {
      removeInterest(value[value.length - 1]);
    }
  }

  // подсказки из каталога — только те, что ещё не выбраны
  const suggestions = INTEREST_OPTIONS.filter((opt) => !alreadyPicked(opt.label));
  const isFull = value.length >= MAX_INTERESTS;

  return (
    <div className="picker">
      {value.length > 0 && (
        <div className="picker__row">
          {value.map((name) => (
            <button
              type="button"
              className="ichip ichip--picked"
              key={name}
              onClick={() => removeInterest(name)}
            >
              <span className="ichip__emoji">{interestEmoji(name)}</span>
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
        placeholder={isFull ? 'Достаточно интересов' : 'Свой вариант, затем Enter'}
        disabled={isFull}
        maxLength={20}
      />

      {!isFull && suggestions.length > 0 && (
        <div className="picker__row picker__row--suggestions">
          {suggestions.map((opt) => (
            <button
              type="button"
              className="ichip ichip--add"
              key={opt.label}
              onClick={() => addInterest(opt.label)}
            >
              <span className="ichip__emoji">{opt.emoji}</span>
              {opt.label}
              <span className="ichip__plus">+</span>
            </button>
          ))}
        </div>
      )}

      <p className="field__hint">
        {value.length}/{MAX_INTERESTS}
      </p>
    </div>
  );
}
