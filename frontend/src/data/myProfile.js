// Хранилище анкеты пользователя.
//
// localStorage — это маленькое хранилище "ключ-значение" прямо в браузере.
// Оно переживает перезагрузку страницы и закрытие вкладки.
// Минусы: хранит только строки, живёт на одном устройстве, лимит ~5 МБ.
// Позже заменим на сохранение в базу данных на сервере.

const STORAGE_KEY = 'my-profile'; // под этим именем лежат наши данные

// Пустая анкета по умолчанию — если пользователь ещё ничего не заполнил.
export const defaultProfile = {
  name: '',
  age: 25,
  city: '',
  bio: '',
  interests: [],
  photos: [], // фото пользователь загрузит сам из галереи
};

// Прочитать анкету из localStorage.
export function loadMyProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY); // достаём строку (или null)
    if (!raw) return defaultProfile;

    // В localStorage всё хранится строками, поэтому объект надо "распарсить" обратно.
    const saved = JSON.parse(raw);

    // Подмешиваем к дефолту: если в сохранённых данных чего-то не хватает,
    // поле возьмётся из defaultProfile.
    return { ...defaultProfile, ...saved };
  } catch {
    // Если данные битые или localStorage недоступен — не падаем, отдаём дефолт.
    return defaultProfile;
  }
}

// Записать анкету в localStorage.
export function saveMyProfile(profile) {
  try {
    // Объект -> строка JSON, потому что localStorage хранит только строки.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Не удалось сохранить профиль:', e);
  }
}
