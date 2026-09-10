import { useState } from 'react';
import { DEFAULT_FILTERS } from '../lib/filters';
import { HOUSING, CAR, EMPLOYMENT } from '../data/lifestyle';
import CityInput from './CityInput';
import { isPremium } from '../premium';

const SORTS = [
  { code: '', label: 'Сейчас активны' },
  { code: 'new', label: 'Новенькие', premium: true },
];

// Шторка с фильтрами ленты поиска.
//
// Props:
//   value   - текущие фильтры
//   onApply - применить: onApply(новыеФильтры)
//   onClose - закрыть без изменений

const GENDERS = [
  { code: 'f', label: 'Девушек' },
  { code: 'm', label: 'Парней' },
];

// Один ряд чипов "выбрать один код или ничего".
function OneRow({ label, options, value, onPick }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="choice">
        {options.map((o) => (
          <button
            key={o.code}
            type="button"
            className={`chipbtn ${value === o.code ? 'is-on' : ''}`}
            onClick={() => onPick(value === o.code ? '' : o.code)}
          >
            {o.emoji ? `${o.emoji} ` : ''}
            {o.short || o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FilterSheet({ value, onApply, onClose }) {
  const [f, setF] = useState(value);
  const premium = isPremium();

  const set = (patch) => setF((cur) => ({ ...cur, ...patch }));

  const toggleHousing = (code) =>
    set({
      housing: f.housing.includes(code)
        ? f.housing.filter((c) => c !== code)
        : [...f.housing, code],
    });

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__card" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__body">
          <h2>Фильтры</h2>

          <div className="form">
            <div className="field">
              <span>Возраст</span>
              <div className="filter__age">
                <input
                  type="number"
                  min={18}
                  max={100}
                  placeholder="от"
                  value={f.ageMin}
                  onChange={(e) => set({ ageMin: e.target.value })}
                />
                <span className="filter__dash">–</span>
                <input
                  type="number"
                  min={18}
                  max={100}
                  placeholder="до"
                  value={f.ageMax}
                  onChange={(e) => set({ ageMax: e.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <span>Город</span>
              <CityInput
                value={f.city}
                onChange={(v) => set({ city: v })}
                placeholder="Любой"
              />
            </div>

            <div className="field">
              <span>Сортировка</span>
              <div className="choice">
                {SORTS.map((o) => {
                  const locked = o.premium && !premium;
                  return (
                    <button
                      key={o.code || 'default'}
                      type="button"
                      className={`chipbtn ${f.sort === o.code ? 'is-on' : ''}`}
                      disabled={locked}
                      onClick={() => set({ sort: o.code })}
                    >
                      {o.label}
                      {o.premium && <span className="chipbtn__pro">PRO</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <OneRow
              label="Кого показывать"
              options={GENDERS}
              value={f.gender}
              onPick={(v) => set({ gender: v })}
            />

            <div className="field">
              <span>Жильё</span>
              <div className="choice">
                {HOUSING.map((o) => (
                  <button
                    key={o.code}
                    type="button"
                    className={`chipbtn ${
                      f.housing.includes(o.code) ? 'is-on' : ''
                    }`}
                    onClick={() => toggleHousing(o.code)}
                  >
                    {o.emoji} {o.short}
                  </button>
                ))}
              </div>
            </div>

            <OneRow
              label="Автомобиль"
              options={CAR}
              value={f.car}
              onPick={(v) => set({ car: v })}
            />

            <OneRow
              label="Работа"
              options={EMPLOYMENT}
              value={f.employment}
              onPick={(v) => set({ employment: v })}
            />

            <div className="form__actions">
              <button
                type="button"
                className="btn-wide btn-wide--ghost"
                onClick={() => setF({ ...DEFAULT_FILTERS })}
              >
                Сбросить
              </button>
              <button type="button" className="btn-wide" onClick={() => onApply(f)}>
                Показать
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
