import { useRef, useState } from 'react';
import { fileToCompressedDataUrl } from '../lib/image';
import InterestPicker from '../components/InterestPicker';

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
  const [photoError, setPhotoError] = useState('');
  const [uploading, setUploading] = useState(false);

  // useRef даёт «ссылку» на реальный DOM-элемент.
  // Нужен, чтобы по клику на нашу кнопку программно открыть скрытый <input type="file">.
  const fileInputRef = useRef(null);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Пользователь выбрал один или несколько файлов в галерее.
  async function handleFilesSelected(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = ''; // сброс: иначе повторный выбор того же файла не сработает
    if (files.length === 0) return;

    setPhotoError('');
    setUploading(true);
    try {
      const room = MAX_PHOTOS - form.photos.length; // сколько ещё можно добавить
      const picked = files.slice(0, room);

      // Сжимаем все выбранные файлы параллельно и ждём, пока все будут готовы.
      const dataUrls = await Promise.all(picked.map(fileToCompressedDataUrl));

      setForm((f) => ({ ...f, photos: [...f.photos, ...dataUrls] }));
    } catch (err) {
      setPhotoError(err.message || 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index) {
    setForm((f) => ({
      ...f,
      photos: f.photos.filter((_, i) => i !== index),
    }));
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
      setError('Возраст должен быть числом от 18 до 100');
      return;
    }

    onSave({
      name: form.name.trim(),
      age,
      city: form.city.trim(),
      bio: form.bio.trim(),
      interests: form.interests,
      photos: form.photos,
    });
  }

  return (
    <div className="screen">
      <h1 className="screen__title">Редактирование анкеты</h1>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <span>Фото (до {MAX_PHOTOS}, первое — главное)</span>

          <div className="photos">
            {form.photos.map((src, i) => (
              <div className="photos__item" key={i}>
                <img src={src} alt={`Фото ${i + 1}`} />
                <button
                  type="button"
                  className="photos__remove"
                  onClick={() => removePhoto(i)}
                  aria-label="Удалить фото"
                >
                  ✕
                </button>
                {i === 0 && <span className="photos__badge">Главное</span>}
              </div>
            ))}

            {form.photos.length < MAX_PHOTOS && (
              <button
                type="button"
                className="photos__add"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Загрузка…' : '+ Добавить'}
              </button>
            )}
          </div>

          {/* Скрытый настоящий input. accept="image/*" на телефоне предлагает
              выбрать галерею или камеру. multiple — можно отметить сразу несколько. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleFilesSelected}
          />

          {photoError && <p className="form__error">{photoError}</p>}
        </div>

        <label className="field">
          <span>Имя</span>
          <input
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            maxLength={30}
            placeholder="Как вас зовут"
          />
        </label>

        <label className="field">
          <span>Возраст</span>
          <input
            type="number"
            value={form.age}
            onChange={(e) => updateField('age', e.target.value)}
            min={18}
            max={100}
          />
        </label>

        <label className="field">
          <span>Город</span>
          <input
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
            maxLength={40}
            placeholder="Москва"
          />
        </label>

        <label className="field">
          <span>О себе</span>
          <textarea
            rows={4}
            value={form.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            maxLength={300}
            placeholder="Пара слов о себе, чем занимаетесь, что ищете"
          />
          <span className="field__hint">{form.bio.length}/300</span>
        </label>

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
