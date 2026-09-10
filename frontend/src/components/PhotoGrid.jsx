import { useRef, useState } from 'react';
import { uploadPhotos } from '../lib/photos';

// Сетка фото с добавлением из галереи и удалением.
// Управляемый компонент: список фото и его изменения живут у родителя.
//
// Props:
//   photos   — массив url-ов
//   onChange — onChange(новыйМассив)
//   max      — сколько фото максимум (по умолчанию 4)

export default function PhotoGrid({ photos, onChange, max = 4 }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleSelected(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = ''; // сброс: иначе повторный выбор того же файла молчит
    if (files.length === 0) return;

    setError('');
    setUploading(true);
    try {
      const room = max - photos.length; // сколько ещё влезет
      const urls = await uploadPhotos(files.slice(0, room));
      onChange([...photos, ...urls]);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="photos">
        {photos.map((src, i) => (
          <div className="photos__item" key={src + i}>
            <img src={src} alt={`Фото ${i + 1}`} />
            <button
              type="button"
              className="photos__remove"
              onClick={() => removeAt(i)}
              aria-label="Удалить фото"
            >
              ✕
            </button>
            {i === 0 && <span className="photos__badge">Главное</span>}
          </div>
        ))}

        {photos.length < max && (
          <button
            type="button"
            className="photos__add"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Загрузка…' : '+ Добавить'}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleSelected}
      />

      {error && <p className="form__error">{error}</p>}
    </div>
  );
}
