// Загрузка фото анкеты: PhotoGrid прогоняет каждое фото через PhotoEditor
// (кадрирование до нужного размера), а этот модуль просто отправляет
// готовые dataURL на сервер и возвращает ссылки.

import { api } from '../api';

// dataUrls — уже готовые строки "data:image/jpeg;base64,..." (из PhotoEditor).
// Возвращает массив url-ов ('/uploads/..').
export async function uploadDataUrls(dataUrls) {
  return Promise.all(
    dataUrls.map(async (dataUrl) => {
      const res = await api.post('/upload', { dataUrl });
      return res.url;
    })
  );
}
