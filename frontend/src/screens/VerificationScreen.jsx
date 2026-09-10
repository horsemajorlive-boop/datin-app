import { useEffect, useRef, useState } from 'react';
import { api, normalizeProfile } from '../api';
import { randomPose } from '../data/poses';
import { IconChevronLeft } from '../components/icons';

// Экран верификации: показываем случайную позу, снимаем ЖИВОЕ селфи с камеры
// и отправляем модератору. Галерея недоступна намеренно — только камера.
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
  const [retry, setRetry] = useState(0); // счётчик повторных попыток включить камеру
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Включаем камеру при монтировании и при каждом нажатии "Повторить".
  // Гасим поток при уходе с экрана.
  useEffect(() => {
    if (status === 'pending' || shot) return; // форма/камера не нужны

    let cancelled = false;
    setCamError('');

    (async () => {
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
        setCamError(
          'Нет доступа к камере. Разрешите камеру в настройках и попробуйте снова — без живого фото верификацию пройти нельзя.'
        );
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [status, shot, retry]);

  // Снять кадр из видео на canvas и получить dataURL.
  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const side = Math.min(video.videoWidth, video.videoHeight);
    const out = Math.min(side, 720);
    const canvas = document.createElement('canvas');
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext('2d');
    // Обрезаем по центру в квадрат.
    const sx = (video.videoWidth - side) / 2;
    const sy = (video.videoHeight - side) / 2;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, out, out);
    setShot(canvas.toDataURL('image/jpeg', 0.85));
    // поток больше не нужен — гасим камеру
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function retake() {
    setShot(null);
    setSendError('');
    setRetry((r) => r + 1); // перезапустит камеру через useEffect
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
                  onClick={retake}
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
                onClick={() => setRetry((r) => r + 1)}
              >
                Повторить
              </button>
            ) : (
              <button className="btn-wide" onClick={capture}>
                Сделать фото
              </button>
            )}
          </div>

          {sendError && <p className="form__error">{sendError}</p>}

          <p className="muted verify-note">
            Фото делается только камерой, здесь и сейчас — галерею выбрать нельзя.
            Селфи видит лишь модератор, в анкете оно не показывается и удаляется
            после проверки.
          </p>
        </>
      )}
    </div>
  );
}
