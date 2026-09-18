import { useState } from 'react';
import { GROUP_CREATE_PRICE_STARS } from '../premium';
import { api, assetUrl } from '../api';
import { getTelegram } from '../telegram';
import { fileToCompressedDataUrl } from '../lib/image';
import CityInput from './CityInput';
import InterestSearchPicker from './InterestSearchPicker';
import { IconX, IconImage } from './icons';

const NAME_MAX = 60;
const DESC_MAX = 300;

// Шторка создания группы — платно (Stars), поэтому не просто форма +
// onSave, а тот же цикл, что и покупка Premium в SettingsScreen: счёт →
// Telegram.WebApp.openInvoice → по статусу 'paid' группа уже реально
// создана на сервере (черновик оплачен, см. /api/groups и вебхук).
//
// Props:
//   defaultCity — город по умолчанию (своя анкета)
//   onClose     — закрыть без создания
//   onCreated   — onCreated(groupId) — оплата прошла, группу можно открывать

export default function GroupCreateSheet({ defaultCity, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(defaultCity || '');
  const [interest, setInterest] = useState('');
  const [photo, setPhoto] = useState(''); // uploaded url
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = name.trim() && city && !paying && !uploadingPhoto;

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    setError('');
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      const { url } = await api.post('/upload', { dataUrl });
      setPhoto(url);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить фото');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleCreate() {
    setError('');
    setPaying(true);
    try {
      const { url, groupId } = await api.post('/groups', {
        name: name.trim(),
        description: description.trim(),
        city,
        interest,
        photo: photo || undefined,
      });
      const tg = getTelegram();
      if (tg?.openInvoice) {
        tg.openInvoice(url, (status) => {
          if (status === 'paid') {
            onCreated(groupId);
          } else {
            setPaying(false);
          }
        });
      } else {
        window.open(url, '_blank');
        setPaying(false);
      }
    } catch (err) {
      setError(err.message || 'Не получилось начать оплату');
      setPaying(false);
    }
  }

  return (
    <div className="sheet" onClick={() => !paying && onClose()}>
      <div className="sheet__card" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__body">
          <div className="filtersheet__head">
            <h2>Новая группа</h2>
            <button className="filtersheet__close" onClick={onClose} aria-label="Закрыть" disabled={paying}>
              <IconX />
            </button>
          </div>

          <div className="field">
            <span>Обложка · необязательно</span>
            <label className="group-cover-pick">
              {photo ? (
                <img src={assetUrl(photo)} alt="" />
              ) : (
                <span className="group-cover-pick__empty">
                  <IconImage />
                  {uploadingPhoto ? 'Загрузка…' : 'Добавить фото'}
                </span>
              )}
              <input type="file" accept="image/*" hidden onChange={handlePhoto} disabled={uploadingPhoto} />
            </label>
          </div>

          <label className="field">
            <span>Название</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              placeholder="Например, «Утренние пробежки»"
            />
          </label>

          <label className="field">
            <span>Описание · необязательно</span>
            <textarea
              className="report__note"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESC_MAX}
              placeholder="О чём тусовка, когда встречаетесь"
            />
          </label>

          <div className="field">
            <span>Город</span>
            <CityInput value={city} onChange={setCity} placeholder="В каком городе тусовка" />
          </div>

          <div className="field">
            <span>Интерес · необязательно</span>
            <InterestSearchPicker
              value={interest}
              onChange={setInterest}
              placeholder="Начните вводить, напр. «Бег»"
            />
          </div>

          {error && <p className="form__error">{error}</p>}

          <button type="button" className="btn-wide" disabled={!canSubmit} onClick={handleCreate}>
            {paying ? 'Открываем оплату…' : `Создать за ${GROUP_CREATE_PRICE_STARS} ⭐`}
          </button>
          <button type="button" className="btn-wide btn-wide--ghost" disabled={paying} onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
