import { useState } from 'react';
import InterestPicker from '../components/InterestPicker';
import ChoiceRow from '../components/ChoiceRow';
import CityInput from '../components/CityInput';
import RangeRow from '../components/RangeRow';
import PhotoGrid from '../components/PhotoGrid';
import PromptEditor from '../components/PromptEditor';
import Switch from '../components/Switch';
import { IconChevronLeft } from '../components/icons';
import { HOUSING, CAR, EMPLOYMENT } from '../data/lifestyle';
import { SMOKING, DRINKING, HEIGHT_RANGE, WEIGHT_RANGE } from '../data/health';
import { GOAL, KIDS } from '../data/goals';

// Ряд "ник + переключатель показа в анкете" для одной соцсети.
function SocialRow({ label, placeholder, prefix, value, shown, onChangeValue, onChangeShown }) {
  return (
    <div className="field social-row">
      <span>{label}</span>
      <div className="social-row__input">
        {prefix && <span className="social-row__prefix">{prefix}</span>}
        <input
          value={value ?? ''}
          onChange={(e) => onChangeValue(e.target.value)}
          maxLength={200}
          placeholder={placeholder}
        />
        <Switch checked={!!shown} onChange={onChangeShown} />
      </div>
      <span className="field__hint">
        {shown ? 'Видно другим в анкете' : 'Скрыто от других'}
      </span>
    </div>
  );
}

// Экран редактирования анкеты — форма из сгруппированных секций.
//
// Props:
//   profile  — текущая анкета (чем заполнить поля)
//   onSave   — вызвать с новой анкетой при "Сохранить"
//   onCancel — вызвать при "Отмена"

const MAX_PHOTOS = 4;

const GENDERS = [
  { code: 'f', label: 'Женщина' },
  { code: 'm', label: 'Мужчина' },
];

// Секция формы: заголовок-ярлык + панель с полями.
function Section({ title, children }) {
  return (
    <div className="form__section">
      <h3 className="form__section-head">{title}</h3>
      <div className="form__panel">{children}</div>
    </div>
  );
}

export default function EditProfileScreen({ profile, onSave, onCancel }) {
  const [form, setForm] = useState({ ...profile });
  const [error, setError] = useState('');

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (form.photos.length === 0) {
      setError('Добавьте хотя бы одно фото');
      return;
    }
    if (!form.name.trim()) {
      setError('Впишите имя');
      return;
    }
    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 18 || age > 100) {
      setError('Возраст — только от 18 до 100 лет');
      return;
    }
    if (form.gender !== 'f' && form.gender !== 'm') {
      setError('Выберите пол');
      return;
    }
    if (!form.goal) {
      setError('Укажите, что вы хотите от сайта');
      return;
    }

    onSave({
      name: form.name.trim(),
      age,
      gender: form.gender,
      city: form.city.trim(),
      bio: form.bio.trim(),
      prompts: form.prompts || [],
      interests: form.interests,
      goal: form.goal || '',
      kids: form.kids || '',
      housing: form.housing || '',
      car: form.car || '',
      employment: form.employment || '',
      height: form.height ?? null,
      weight: form.weight ?? null,
      smoking: form.smoking || '',
      drinking: form.drinking || '',
      telegram: (form.telegram || '').trim(),
      instagram: (form.instagram || '').trim(),
      vk: (form.vk || '').trim(),
      showTelegram: !!form.showTelegram,
      showInstagram: !!form.showInstagram,
      showVk: !!form.showVk,
      photos: form.photos,
    });
  }

  return (
    <div className="screen">
      <button className="onb__back verify-back" onClick={onCancel} aria-label="Назад">
        <IconChevronLeft />
      </button>
      <div className="edit-top-bar">
        <h1 className="screen__title">Редактирование анкеты</h1>
        <button type="submit" form="edit-profile-form" className="btn-wide edit-top-bar__save">
          Сохранить
        </button>
      </div>

      <form
        id="edit-profile-form"
        className="form form--sections"
        onSubmit={handleSubmit}
      >
        <Section title={`Фото · до ${MAX_PHOTOS}, первое главное`}>
          <PhotoGrid
            photos={form.photos}
            onChange={(next) => updateField('photos', next)}
            max={MAX_PHOTOS}
          />
        </Section>

        <Section title="Основное">
          <label className="field">
            <span>Имя</span>
            <input
              value={form.name ?? ''}
              onChange={(e) => updateField('name', e.target.value)}
              maxLength={30}
              placeholder="Как вас зовут"
            />
          </label>

          <label className="field">
            <span>Возраст</span>
            <input
              type="number"
              value={form.age ?? ''}
              onChange={(e) => updateField('age', e.target.value)}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (e.target.value !== '' && n < 18) updateField('age', 18);
              }}
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
                  className={`chipbtn ${form.gender === g.code ? 'is-on' : ''}`}
                  onClick={() => updateField('gender', g.code)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Город</span>
            <CityInput
              value={form.city ?? ''}
              onChange={(v) => updateField('city', v)}
              placeholder="Начните вводить, напр. Екатер"
            />
          </div>
        </Section>

        <Section title="О себе">
          <label className="field">
            <span>Пара слов о себе</span>
            <textarea
              rows={4}
              value={form.bio ?? ''}
              onChange={(e) => updateField('bio', e.target.value)}
              maxLength={300}
              placeholder="Чем занимаетесь, что ищете, что важно — пишите как удобно"
            />
            <span className="field__hint">{(form.bio ?? '').length}/300</span>
          </label>

          <div className="field">
            <span>Подсказки · по желанию</span>
            <PromptEditor
              value={form.prompts ?? []}
              onChange={(prompts) => updateField('prompts', prompts)}
            />
          </div>
        </Section>

        <Section title="Соцсети · по желанию">
          <SocialRow
            label="Telegram"
            prefix="@"
            placeholder="ваш_ник"
            value={form.telegram}
            shown={form.showTelegram}
            onChangeValue={(v) => updateField('telegram', v)}
            onChangeShown={(v) => updateField('showTelegram', v)}
          />
          <SocialRow
            label="Instagram"
            prefix="@"
            placeholder="ваш_ник"
            value={form.instagram}
            shown={form.showInstagram}
            onChangeValue={(v) => updateField('instagram', v)}
            onChangeShown={(v) => updateField('showInstagram', v)}
          />
          <SocialRow
            label="VK"
            placeholder="vk.com/ваш_профиль"
            value={form.vk}
            shown={form.showVk}
            onChangeValue={(v) => updateField('vk', v)}
            onChangeShown={(v) => updateField('showVk', v)}
          />
        </Section>

        <Section title="Цели знакомства">
          <ChoiceRow
            label="Что хотите от сайта"
            options={GOAL}
            value={form.goal || ''}
            onChange={(v) => updateField('goal', v)}
          />
          <ChoiceRow
            label="Дети"
            options={KIDS}
            value={form.kids || ''}
            onChange={(v) => updateField('kids', v)}
          />
        </Section>

        <Section title="Быт">
          <ChoiceRow
            label="Жильё"
            options={HOUSING}
            value={form.housing || ''}
            onChange={(v) => updateField('housing', v)}
          />
          <ChoiceRow
            label="Автомобиль"
            options={CAR}
            value={form.car || ''}
            onChange={(v) => updateField('car', v)}
          />
          <ChoiceRow
            label="Работа"
            options={EMPLOYMENT}
            value={form.employment || ''}
            onChange={(v) => updateField('employment', v)}
          />
        </Section>

        <Section title="Здоровье">
          <RangeRow
            label="Рост"
            unit="см"
            min={HEIGHT_RANGE.min}
            max={HEIGHT_RANGE.max}
            defaultValue={HEIGHT_RANGE.default}
            value={form.height ?? null}
            onChange={(v) => updateField('height', v)}
          />
          <RangeRow
            label="Вес"
            unit="кг"
            min={WEIGHT_RANGE.min}
            max={WEIGHT_RANGE.max}
            defaultValue={WEIGHT_RANGE.default}
            value={form.weight ?? null}
            onChange={(v) => updateField('weight', v)}
          />
          <ChoiceRow
            label="Курение"
            options={SMOKING}
            value={form.smoking || ''}
            onChange={(v) => updateField('smoking', v)}
          />
          <ChoiceRow
            label="Алкоголь"
            options={DRINKING}
            value={form.drinking || ''}
            onChange={(v) => updateField('drinking', v)}
          />
        </Section>

        <Section title="Интересы">
          <InterestPicker
            value={form.interests}
            onChange={(next) => updateField('interests', next)}
          />
        </Section>

        {error && <p className="form__error">{error}</p>}

        <div className="form__actions">
          <button
            type="button"
            className="btn-wide btn-wide--ghost"
            onClick={onCancel}
          >
            Отмена
          </button>
          <button type="submit" className="btn-wide">
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
