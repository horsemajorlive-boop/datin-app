import { useState } from 'react';
import { DEFAULT_FILTERS, clampAge } from '../lib/filters';
import { HOUSING, CAR, EMPLOYMENT } from '../data/lifestyle';
import { SMOKING, DRINKING, HEIGHT_RANGE } from '../data/health';
import { GOAL, KIDS } from '../data/goals';
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
function OneRow({ label, options, value, onPick, useLabel = false }) {
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
            {useLabel ? o.label : o.short || o.label}
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

  // Возраст: по Enter или уходу из поля подтягиваем значение к диапазону 18–100.
  const fixAge = (field) => set({ [field]: clampAge(f[field]) });
  const onAgeKeyDown = (field) => (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fixAge(field);
    }
  };

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
                  onBlur={() => fixAge('ageMin')}
                  onKeyDown={onAgeKeyDown('ageMin')}
                />
                <span className="filter__dash">–</span>
                <input
                  type="number"
                  min={18}
                  max={100}
                  placeholder="до"
                  value={f.ageMax}
                  onChange={(e) => set({ ageMax: e.target.value })}
                  onBlur={() => fixAge('ageMax')}
                  onKeyDown={onAgeKeyDown('ageMax')}
                />
              </div>
              <span className="field__hint">Только с 18 лет</span>
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
              <span>Верификация</span>
              <div className="choice">
                <button
                  type="button"
                  className={`chipbtn ${f.verified ? 'is-on' : ''}`}
                  onClick={() => set({ verified: !f.verified })}
                >
                  Только подтверждённые
                </button>
              </div>
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
                    {o.short}
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

            <OneRow
              label="Что ищет"
              options={GOAL}
              value={f.goal}
              onPick={(v) => set({ goal: v })}
            />

            <OneRow
              label="Дети"
              options={KIDS}
              value={f.kids}
              onPick={(v) => set({ kids: v })}
              useLabel
            />

            <div className="field">
              <span>Рост, см</span>
              <div className="filter__age">
                <input
                  type="number"
                  min={HEIGHT_RANGE.min}
                  max={HEIGHT_RANGE.max}
                  placeholder="от"
                  value={f.heightMin}
                  onChange={(e) => set({ heightMin: e.target.value })}
                />
                <span className="filter__dash">–</span>
                <input
                  type="number"
                  min={HEIGHT_RANGE.min}
                  max={HEIGHT_RANGE.max}
                  placeholder="до"
                  value={f.heightMax}
                  onChange={(e) => set({ heightMax: e.target.value })}
                />
              </div>
            </div>

            <OneRow
              label="Курение"
              options={SMOKING}
              value={f.smoking}
              onPick={(v) => set({ smoking: v })}
            />

            <OneRow
              label="Алкоголь"
              options={DRINKING}
              value={f.drinking}
              onPick={(v) => set({ drinking: v })}
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
