import { useState } from 'react';
import PhotoGrid from '../components/PhotoGrid';
import RangeRow from '../components/RangeRow';
import ChoiceRow from '../components/ChoiceRow';
import InterestPicker from '../components/InterestPicker';
import AdminGate from '../components/AdminGate';
import { api, normalizeProfile } from '../api';
import { clampAge } from '../lib/filters';
import { RULES } from '../data/rules';
import { HOUSING, CAR, EMPLOYMENT } from '../data/lifestyle';
import { HEIGHT_RANGE, WEIGHT_RANGE } from '../data/health';
import { GOAL, KIDS } from '../data/goals';
import { IconChevronLeft, IconCheck } from '../components/icons';

// Обязательный вход в приложение. Пока пользователь не пройдёт все шаги,
// App не показывает основной интерфейс — обойти экран нельзя.
//
// Шаги: 0 приветствие · 1 правила · 2 фото · 3 о себе (+ рост/вес по желанию)
//       · 4 цели знакомства · 5 имущество · 6 интересы (минимум 5)
//
// Props:
//   onDone(profile) — вызвать с готовой анкетой, когда сервер подтвердил вход
//   onAdminUnlock() — сработал секретный жест на сердечке (см. AdminGate)

const GENDERS = [
  { code: 'f', label: 'Женщина' },
  { code: 'm', label: 'Мужчина' },
];

const MIN_INTERESTS = 5;
const STEPS_TOTAL = 7;

export default function Onboarding({ onDone, onAdminUnlock }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    acceptAge: false,
    acceptRules: false,
    photos: [],
    name: '',
    age: '',
    gender: '',
    height: null,
    weight: null,
    goal: '',
    kids: '',
    housing: '',
    car: '',
    employment: '',
    interests: [],
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const next = () => setStep((s) => Math.min(STEPS_TOTAL - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  async function finish() {
    setError('');
    setSubmitting(true);
    try {
      const profile = await api.post('/onboarding', {
        acceptAge: data.acceptAge,
        acceptRules: data.acceptRules,
        name: data.name.trim(),
        age: Number(data.age),
        gender: data.gender,
        photos: data.photos,
        height: data.height ?? null,
        weight: data.weight ?? null,
        goal: data.goal,
        kids: data.kids,
        housing: data.housing,
        car: data.car,
        employment: data.employment,
        interests: data.interests,
      });
      onDone(normalizeProfile(profile));
    } catch (err) {
      setError(err.message || 'Не получилось войти, попробуйте ещё раз');
      setSubmitting(false);
    }
  }

  // можно ли уйти с текущего шага дальше
  const canContinue =
    step === 0 ||
    (step === 1 && data.acceptAge && data.acceptRules) ||
    (step === 2 && data.photos.length > 0) ||
    (step === 3 && data.name.trim() && Number(data.age) >= 18 && data.gender) ||
    (step === 4 && data.goal) ||
    (step === 5 && data.housing && data.car && data.employment) ||
    (step === 6 && data.interests.length >= MIN_INTERESTS);

  const interestsLeft = MIN_INTERESTS - data.interests.length;

  return (
    <div className="onb">
      <header className="onb__top">
        {step > 0 ? (
          <button className="onb__back" onClick={back} aria-label="Назад">
            <IconChevronLeft />
          </button>
        ) : (
          <span className="onb__back" />
        )}
        <div className="onb__dots">
          {Array.from({ length: STEPS_TOTAL }, (_, i) => (
            <span
              key={i}
              className={`onb__dot ${i === step ? 'is-on' : ''} ${
                i < step ? 'is-done' : ''
              }`}
            />
          ))}
        </div>
        <span className="onb__back" />
      </header>

      <div className="onb__body">
        {step === 0 && (
          <div className="onb__welcome">
            <AdminGate onUnlock={onAdminUnlock} />
            <h1>Знакомства</h1>
            <p className="muted">
              Здесь ищут серьёзные отношения. Пара минут на анкету — и можно
              листать.
            </p>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="onb__title">Правила</h2>
            <ul className="onb__rules">
              {RULES.map((r) => (
                <li key={r.title}>
                  <b>{r.title}.</b> {r.text}
                </li>
              ))}
            </ul>

            <label className="onb__check">
              <input
                type="checkbox"
                checked={data.acceptAge}
                onChange={(e) => set({ acceptAge: e.target.checked })}
              />
              <span className="onb__box">
                <IconCheck />
              </span>
              <span>Мне есть 18 лет</span>
            </label>

            <label className="onb__check">
              <input
                type="checkbox"
                checked={data.acceptRules}
                onChange={(e) => set({ acceptRules: e.target.checked })}
              />
              <span className="onb__box">
                <IconCheck />
              </span>
              <span>Я принимаю правила пользования</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="onb__title">Фото</h2>
            <p className="muted onb__hint">
              Хотя бы одно фото, где видно вас. Первое станет главным.
            </p>
            <PhotoGrid
              photos={data.photos}
              onChange={(photos) => set({ photos })}
              max={4}
            />
          </div>
        )}

        {step === 3 && (
          <div className="form">
            <h2 className="onb__title">О себе</h2>

            <label className="field">
              <span>Имя</span>
              <input
                value={data.name}
                onChange={(e) => set({ name: e.target.value })}
                maxLength={30}
                placeholder="Как вас зовут"
              />
            </label>

            <label className="field">
              <span>Возраст</span>
              <input
                type="number"
                value={data.age}
                onChange={(e) => set({ age: e.target.value })}
                onBlur={() => set({ age: clampAge(data.age) })}
                min={18}
                max={100}
                placeholder="Только с 18 лет"
              />
            </label>

            <div className="field">
              <span>Пол</span>
              <div className="choice">
                {GENDERS.map((g) => (
                  <button
                    key={g.code}
                    type="button"
                    className={`chipbtn ${data.gender === g.code ? 'is-on' : ''}`}
                    onClick={() => set({ gender: g.code })}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <RangeRow
              label="Рост"
              unit="см"
              min={HEIGHT_RANGE.min}
              max={HEIGHT_RANGE.max}
              defaultValue={HEIGHT_RANGE.default}
              value={data.height}
              onChange={(v) => set({ height: v })}
            />
            <RangeRow
              label="Вес"
              unit="кг"
              min={WEIGHT_RANGE.min}
              max={WEIGHT_RANGE.max}
              defaultValue={WEIGHT_RANGE.default}
              value={data.weight}
              onChange={(v) => set({ weight: v })}
            />
            <p className="field__hint">Рост и вес — по желанию</p>
          </div>
        )}

        {step === 4 && (
          <div className="form">
            <h2 className="onb__title">Цели знакомства</h2>
            <p className="muted onb__hint">
              Так проще найти тех, кто ищет то же самое.
            </p>
            <ChoiceRow
              label="Что хотите от сайта"
              options={GOAL}
              value={data.goal}
              onChange={(v) => set({ goal: v })}
            />
            <ChoiceRow
              label="Дети · по желанию"
              options={KIDS}
              value={data.kids}
              onChange={(v) => set({ kids: v })}
            />
          </div>
        )}

        {step === 5 && (
          <div className="form">
            <h2 className="onb__title">Имущество</h2>
            <p className="muted onb__hint">Коротко о быте — это важно для поиска.</p>
            <ChoiceRow
              label="Жильё"
              options={HOUSING}
              value={data.housing}
              onChange={(v) => set({ housing: v })}
            />
            <ChoiceRow
              label="Автомобиль"
              options={CAR}
              value={data.car}
              onChange={(v) => set({ car: v })}
            />
            <ChoiceRow
              label="Работа"
              options={EMPLOYMENT}
              value={data.employment}
              onChange={(v) => set({ employment: v })}
            />
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 className="onb__title">Интересы</h2>
            <p className="muted onb__hint">
              {interestsLeft > 0
                ? `Выберите минимум ${MIN_INTERESTS}. Осталось ещё ${interestsLeft}.`
                : `Выбрано ${data.interests.length}. Можно добавить ещё или продолжить.`}
            </p>
            <InterestPicker
              value={data.interests}
              onChange={(interests) => set({ interests })}
              tall
            />
          </div>
        )}

        {error && <p className="form__error onb__error">{error}</p>}
      </div>

      <footer className="onb__foot">
        {step < STEPS_TOTAL - 1 ? (
          <button className="btn-wide" disabled={!canContinue} onClick={next}>
            {step === 0 ? 'Начать' : 'Продолжить'}
          </button>
        ) : (
          <button
            className="btn-wide"
            disabled={!canContinue || submitting}
            onClick={finish}
          >
            {submitting ? 'Входим…' : 'Войти'}
          </button>
        )}
      </footer>
    </div>
  );
}
