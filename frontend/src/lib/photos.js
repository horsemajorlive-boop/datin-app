// Загрузка фото анкеты: сжать на клиенте -> отправить на сервер -> получить ссылку.
// Используется и в редакторе анкеты, и на экране обязательного входа.

import { fileToCompressedDataUrl } from './image';
import { api } from '../api';

// files — массив File из <input type="file">. Возвращает массив url-ов ('/uploads/..').
export async function uploadPhotos(files) {
  return Promise.all(
    files.map(async (file) => {
      const dataUrl = await fileToCompressedDataUrl(file);
      const res = await api.post('/upload', { dataUrl });
      return res.url;
    })
  );
}
