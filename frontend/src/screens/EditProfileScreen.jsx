import { useState } from 'react';
import InterestPicker from '../components/InterestPicker';
import ChoiceRow from '../components/ChoiceRow';
import CityInput from '../components/CityInput';
import RangeRow from '../components/RangeRow';
import PhotoGrid from '../components/PhotoGrid';
import { HOUSING, CAR, EMPLOYMENT } from '../data/lifestyle';
import { SMOKING, DRINKING, HEIGHT_RANGE, WEIGHT_RANGE } from '../data/health';

// Экран редактирования анкеты — форма с загрузкой фото.
//
// Props:
//   profile  — текущая анкета (чем заполнить поля)
//   onSave   — вызвать с новой анкетой при "Сохранить"
//   onCancel — вызвать при "Отмена"

const MAX_PHOTOS = 4;

export default function EditProfileScreen({ profile, onSave, onCancel }) {
  // form.interests теперь массив — им управляет компонент InterestPicker.
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

    onSave({
      name: form.name.trim(),
      age,
      city: form.city.trim(),
      bio: form.bio.trim(),
      interests: form.interests,
      housing: form.housing || '',
      car: form.car || '',
      employment: form.employment || '',
      height: form.height ?? null,
      weight: form.weight ?? null,
      smoking: form.smoking || '',
      drinking: form.drinking || '',
      photos: form.photos,
    });
  }

  return (
    <div className="screen">
      <h1 className="screen__title">Редактирование анкеты</h1>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <span>Фото (до {MAX_PHOTOS}, первое — главное)</span>
          <PhotoGrid
            photos={form.photos}
            onChange={(next) => updateField('photos', next)}
            max={MAX_PHOTOS}
          />
        </div>

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
              // не даём указать младше 18
              const n = Number(e.target.value);
              if (e.target.value !== '' && n < 18) updateField('age', 18);
            }}
            min={18}
            max={100}
            placeholder="Только с 18 лет"
          />
        </label>

        <div className="field">
          <span>Город</span>
          <CityInput
            value={form.city ?? ''}
            onChange={(v) => updateField('city', v)}
            placeholder="Начните вводить, напр. Екатер"
          />
        </div>

        <label className="field">
          <span>О себе</span>
          <textarea
            rows={4}
            value={form.bio ?? ''}
            onChange={(e) => updateField('bio', e.target.value)}
            maxLength={300}
            placeholder="Пара слов о себе, чем занимаетесь, что ищете"
          />
          <span className="field__hint">{(form.bio ?? '').length}/300</span>
        </label>

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

        <div className="field">
          <span>Интересы</span>
          <InterestPicker
            value={form.interests}
            onChange={(next) => updateField('interests', next)}
          />
        </div>

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
