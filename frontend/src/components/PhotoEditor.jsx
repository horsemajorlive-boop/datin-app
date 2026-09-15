import { useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronLeft } from './icons';

// Редактор одного фото перед загрузкой: выбор области (кадрирование),
// перемещение (панорамирование), масштаб (зум) и поворот на 90°.
// Ничего не грузит на сервер — просто отдаёт готовый dataURL нужного размера.
//
// Props:
//   file      — выбранный File
//   aspect    — соотношение сторон кадра, ширина/высота (по умолчанию 4/5 — как карточка анкеты)
//   onConfirm — onConfirm(dataUrl)
//   onCancel  — onCancel()

const DISPLAY_W = 300;
const OUTPUT_W = 1080;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export default function PhotoEditor({ file, aspect = 4 / 5, onConfirm, onCancel }) {
  const canvasRef = useRef(null);
  const [img, setImg] = useState(null);
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');

  const displayH = useMemo(() => Math.round(DISPLAY_W / aspect), [aspect]);

  // Загружаем выбранный файл в <img>.
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      if (!cancelled) setImg(el);
    };
    el.onerror = () => {
      if (!cancelled) setError('Не удалось открыть фото');
    };
    el.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Размер повёрнутого изображения "в габаритах" кадра (90°/270° меняет их местами).
  const effSize = useMemo(() => {
    if (!img) return { w: 1, h: 1 };
    const swapped = rotation === 90 || rotation === 270;
    return {
      w: swapped ? img.naturalHeight : img.naturalWidth,
      h: swapped ? img.naturalWidth : img.naturalHeight,
    };
  }, [img, rotation]);

  const baseScale = useMemo(() => {
    if (!img) return 1;
    return Math.max(DISPLAY_W / effSize.w, displayH / effSize.h);
  }, [img, effSize, displayH]);

  function clampOffset(next, zoomValue) {
    const scale = baseScale * zoomValue;
    const scaledW = effSize.w * scale;
    const scaledH = effSize.h * scale;
    const maxX = Math.max(0, (scaledW - DISPLAY_W) / 2);
    const maxY = Math.max(0, (scaledH - displayH) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  // Перерисовка холста при любом изменении.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    const scale = baseScale * zoom;
    ctx.clearRect(0, 0, DISPLAY_W, displayH);
    ctx.save();
    ctx.translate(DISPLAY_W / 2 + offset.x, displayH / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }, [img, rotation, zoom, offset, baseScale, displayH]);

  // ---------- жесты: перетаскивание одним пальцем, зум двумя ----------
  const pointers = useRef(new Map());
  const drag = useRef(null); // { startX, startY, startOffset }
  const pinch = useRef(null); // { startDist, startZoom }

  function pointerDelta() {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return null;
    const [a, b] = pts;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointers.current.set(e.pointerId, { x, y });

    if (pointers.current.size === 2) {
      drag.current = null;
      pinch.current = { startDist: pointerDelta(), startZoom: zoom };
    } else if (pointers.current.size === 1) {
      pinch.current = null;
      drag.current = { startX: x, startY: y, startOffset: offset };
    }
  }

  function handlePointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointers.current.set(e.pointerId, { x, y });

    if (pointers.current.size === 2 && pinch.current) {
      const dist = pointerDelta();
      if (dist && pinch.current.startDist) {
        const nextZoom = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, pinch.current.startZoom * (dist / pinch.current.startDist))
        );
        setZoom(nextZoom);
        setOffset((prev) => clampOffset(prev, nextZoom));
      }
    } else if (pointers.current.size === 1 && drag.current) {
      const dx = x - drag.current.startX;
      const dy = y - drag.current.startY;
      setOffset(
        clampOffset(
          { x: drag.current.startOffset.x + dx, y: drag.current.startOffset.y + dy },
          zoom
        )
      );
    }
  }

  function endPointer(e) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      drag.current = null;
      pinch.current = null;
    } else if (pointers.current.size === 1) {
      pinch.current = null;
      const [[, p]] = pointers.current;
      drag.current = { startX: p.x, startY: p.y, startOffset: offset };
    }
  }

  function handleWheel(e) {
    e.preventDefault();
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom - e.deltaY * 0.0015));
    setZoom(nextZoom);
    setOffset((prev) => clampOffset(prev, nextZoom));
  }

  function handleZoomSlider(e) {
    const nextZoom = Number(e.target.value);
    setZoom(nextZoom);
    setOffset((prev) => clampOffset(prev, nextZoom));
  }

  function handleRotate() {
    setRotation((r) => (r + 90) % 360);
    setOffset({ x: 0, y: 0 });
  }

  function handleConfirm() {
    const canvas = document.createElement('canvas');
    const outH = Math.round(OUTPUT_W / aspect);
    canvas.width = OUTPUT_W;
    canvas.height = outH;
    const ratio = OUTPUT_W / DISPLAY_W;
    const scale = baseScale * zoom * ratio;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(OUTPUT_W / 2 + offset.x * ratio, outH / 2 + offset.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
    onConfirm(canvas.toDataURL('image/jpeg', 0.85));
  }

  return (
    <div className="photo-editor">
      <header className="photo-editor__head">
        <button type="button" className="photo-editor__back" onClick={onCancel} aria-label="Отмена">
          <IconChevronLeft />
        </button>
        <h2>Кадрирование фото</h2>
        <span className="photo-editor__spacer" />
      </header>

      {error ? (
        <p className="form__error">{error}</p>
      ) : (
        <>
          <div className="photo-editor__frame" style={{ width: DISPLAY_W, height: displayH }}>
            <canvas
              ref={canvasRef}
              width={DISPLAY_W}
              height={displayH}
              className="photo-editor__canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              onWheel={handleWheel}
            />
          </div>

          <div className="photo-editor__controls">
            <button type="button" className="photo-editor__rotate" onClick={handleRotate}>
              ⟳ Повернуть
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step="0.01"
              value={zoom}
              onChange={handleZoomSlider}
              className="photo-editor__zoom"
              aria-label="Масштаб"
            />
          </div>
        </>
      )}

      <div className="photo-editor__actions">
        <button type="button" className="btn-wide btn-wide--ghost" onClick={onCancel}>
          Отмена
        </button>
        <button
          type="button"
          className="btn-wide"
          onClick={handleConfirm}
          disabled={!img || !!error}
        >
          Готово
        </button>
      </div>
    </div>
  );
}
