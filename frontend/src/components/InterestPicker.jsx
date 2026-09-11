import { INTEREST_CATEGORIES, interestIconKey } from '../data/interests';
import { InterestIcon } from './interestIcons';

// Выбор интересов — только из каталога, свои варианты вводить нельзя.
//
// Props:
//   value    — массив выбранных интересов (строки)
//   onChange — вызвать с новым массивом
//   tall     — не зажимать список в маленькое окошко со своим скроллом
//              (когда это единственное на экране, как в онбординге —
//              пусть каталог из ~200 интересов пролистывается на весь экран)

const MAX_INTERESTS = 15;

export default function InterestPicker({ value, onChange, tall = false }) {
  const has = (name) => value.some((v) => v.toLowerCase() === name.toLowerCase());
  const isFull = value.length >= MAX_INTERESTS;

  function toggle(name) {
    if (has(name)) {
      onChange(value.filter((v) => v.toLowerCase() !== name.toLowerCase()));
    } else if (!isFull) {
      onChange([...value, name]);
    }
  }

  return (
    <div className={`picker ${tall ? 'picker--tall' : ''}`}>
      {value.length > 0 && (
        <div className="picker__row">
          {value.map((name) => (
            <button
              type="button"
              key={name}
              className="ichip ichip--picked"
              onClick={() => toggle(name)}
            >
              <InterestIcon iconKey={interestIconKey(name)} />
              {name}
              <span className="ichip__x">✕</span>
            </button>
          ))}
        </div>
      )}

      <p className="field__hint picker__count">
        {isFull ? 'Достаточно интересов' : `Выбрано ${value.length} из ${MAX_INTERESTS}`}
      </p>

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
    </div>
  );
}
