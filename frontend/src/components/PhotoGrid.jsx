import { useRef, useState } from 'react';
import { uploadDataUrls } from '../lib/photos';
import PhotoEditor from './PhotoEditor';

// Сетка фото с добавлением из галереи и удалением.
// Управляемый компонент: список фото и его изменения живут у родителя.
// Перед загрузкой каждое новое фото проходит через редактор (кадр 4:5,
// перемещение, зум, поворот) — так фото не обрезается "случайно".
//
// Props:
//   photos   — массив url-ов
//   onChange — onChange(новыйМассив)
//   max      — сколько фото максимум (по умолчанию 4)

export default function PhotoGrid({ photos, onChange, max = 4 }) {
  const [queue, setQueue] = useState([]); // File[] — ждут редактирования
  const [editing, setEditing] = useState(null); // текущий File в редакторе
  const [edited, setEdited] = useState([]); // dataUrl[] — уже отредактированы
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  function handleSelected(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = ''; // сброс: иначе повторный выбор того же файла молчит
    if (files.length === 0) return;

    setError('');
    const room = max - photos.length; // сколько ещё влезет
    const picked = files.slice(0, room);
    setEdited([]);
    setQueue(picked.slice(1));
    setEditing(picked[0] || null);
  }

  async function finishQueue(allDataUrls) {
    setEditing(null);
    setQueue([]);
    if (allDataUrls.length === 0) return;
    setUploading(true);
    try {
      const urls = await uploadDataUrls(allDataUrls);
      onChange([...photos, ...urls]);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
    }
  }

  function handleEditConfirm(dataUrl) {
    const next = [...edited, dataUrl];
    if (queue.length > 0) {
      setEdited(next);
      setEditing(queue[0]);
      setQueue(queue.slice(1));
    } else {
      setEdited([]);
      finishQueue(next);
    }
  }

  function handleEditCancel() {
    // Пропускаем текущее фото, переходим к следующему в очереди (если есть).
    if (queue.length > 0) {
      setEditing(queue[0]);
      setQueue(queue.slice(1));
    } else {
      setEditing(null);
      finishQueue(edited);
      setEdited([]);
    }
  }

  function removeAt(index) {
    onChange(photos.filter((_, i) => i !== index));
  }

  if (editing) {
    return (
      <PhotoEditor file={editing} onConfirm={handleEditConfirm} onCancel={handleEditCancel} />
    );
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
