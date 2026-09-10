import { useEffect, useRef, useState } from 'react';
import { api, normalizeProfile } from '../api';
import { fileToCompressedDataUrl } from '../lib/image';
import { randomPose } from '../data/poses';
import { IconChevronLeft } from '../components/icons';

// Экран верификации: показываем случайную позу, снимаем селфи с камеры
// (или, если камеры нет, даём выбрать файл), отправляем модератору.
//
// Props:
//   status      — profile.verificationStatus ('none' | 'pending' | 'rejected' | 'approved')
//   onBack      — вернуться в профиль
//   onSubmitted — onSubmitted(новыйProfile) после успешной отправки

export default function VerificationScreen({ status, onBack, onSubmitted }) {
  // Позу выбираем один раз при открытии экрана.
  const [pose] = useState(randomPose);
  const [shot, setShot] = useState(null); // dataURL готового снимка
  const [camError, setCamError] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  // Включаем камеру при монтировании, гасим при уходе с экрана.
  useEffect(() => {
    if (status === 'pending') return; // форма не нужна

    let cancelled = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        // нет доступа к камере — покажем выбор файла
        setCamError('Камера недоступна — выберите фото из галереи');
      }
    }
    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [status]);

  // Снять кадр из видео на canvas и получить dataURL.
  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth, video.videoHeight, 720);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    // Обрезаем по центру в квадрат.
    const sx = (video.videoWidth - Math.min(video.videoWidth, video.videoHeight)) / 2;
    const sy = (video.videoHeight - Math.min(video.videoWidth, video.videoHeight)) / 2;
    const s = Math.min(video.videoWidth, video.videoHeight);
    ctx.drawImage(video, sx, sy, s, s, 0, 0, size, size);
    setShot(canvas.toDataURL('image/jpeg', 0.85));
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setShot(await fileToCompressedDataUrl(file));
    } catch (err) {
      setSendError(err.message || 'Не удалось прочитать фото');
    }
  }

  async function send() {
    if (!shot) return;
    setSendError('');
    setSending(true);
    try {
      const profile = await api.post('/verification', { dataUrl: shot, pose });
      onSubmitted(normalizeProfile(profile));
    } catch (err) {
      setSendError(err.message || 'Не удалось отправить, попробуйте ещё раз');
      setSending(false);
    }
  }

  return (
    <div className="screen">
      <button className="onb__back verify-back" onClick={onBack} aria-label="Назад">
        <IconChevronLeft />
      </button>
      <h1 className="screen__title">Верификация фото</h1>

      {status === 'pending' ? (
        <p className="muted">
          Ваше селфи на проверке у модератора. Обычно это занимает до 24 часов —
          после одобрения рядом с именем появится золотая галочка.
        </p>
      ) : (
        <>
          <div className="verify-pose">
            <span className="verify-pose__label">Поза для селфи</span>
            <b>{pose}</b>
          </div>

          <div className="verify-cam">
            {shot ? (
              <img src={shot} alt="Ваше селфи" />
            ) : camError ? (
              <div className="verify-cam__ph">{camError}</div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted />
            )}
          </div>

          <div className="verify-actions">
            {shot ? (
              <>
                <button
                  className="btn-wide btn-wide--ghost"
                  onClick={() => setShot(null)}
                  disabled={sending}
                >
                  Переснять
                </button>
                <button className="btn-wide" onClick={send} disabled={sending}>
                  {sending ? 'Отправляем…' : 'Отправить на проверку'}
                </button>
              </>
            ) : camError ? (
              <button
                className="btn-wide"
                onClick={() => fileRef.current?.click()}
              >
                Выбрать фото
              </button>
            ) : (
              <button className="btn-wide" onClick={capture}>
                Сделать фото
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            hidden
            onChange={handleFile}
          />

          {sendError && <p className="form__error">{sendError}</p>}

          <p className="muted verify-note">
            Селфи видит только модератор, оно не показывается в анкете и удаляется
            после проверки.
          </p>
        </>
      )}
    </div>
  );
}
