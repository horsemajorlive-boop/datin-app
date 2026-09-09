// Превращает выбранный файл-картинку в сжатую строку data URL (base64).
//
// Зачем сжимать:
//   - Фото с телефона весит 2–5 МБ.
//   - В localStorage помещается ~5 МБ на ВСЁ приложение.
//   - Поэтому рисуем картинку на <canvas> в уменьшенном размере
//     и экспортируем в JPEG со сжатием → получается ~100–250 КБ.
//
// Позже, когда появится сервер, файл будет уходить на бэкенд как есть,
// а здесь останется только предпросмотр.

const MAX_SIZE = 1080; // максимальная длина большей стороны, px
const QUALITY = 0.8; // качество JPEG: 0 (мыло) … 1 (без сжатия)

export function fileToCompressedDataUrl(file) {
  // Возвращаем Promise, потому что загрузка картинки — асинхронная операция
  // (браузер читает файл не мгновенно). await такого промиса даст готовую строку.
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Это не изображение'));
      return;
    }

    const img = new Image();
    // createObjectURL даёт временную ссылку вида blob:... на файл в памяти
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl); // освобождаем память — ссылка больше не нужна

      // Считаем новый размер, сохраняя пропорции.
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > height && width > MAX_SIZE) {
        height = Math.round((height * MAX_SIZE) / width);
        width = MAX_SIZE;
      } else if (height >= width && height > MAX_SIZE) {
        width = Math.round((width * MAX_SIZE) / height);
        height = MAX_SIZE;
      }

      // <canvas> — это «холст», на котором можно рисовать пикселями.
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height); // рисуем фото уже уменьшенным

      // Забираем содержимое холста строкой "data:image/jpeg;base64,...."
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось прочитать изображение'));
    };

    img.src = objectUrl; // запускаем загрузку — после неё сработает img.onload
  });
}
