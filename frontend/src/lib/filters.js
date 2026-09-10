// Фильтры ленты поиска: значения по умолчанию, сборка query-строки,
// сохранение в localStorage.

export const DEFAULT_FILTERS = {
  ageMin: '',
  ageMax: '',
  city: '',
  gender: '', // '' | 'f' | 'm'  — кого показывать
  housing: [], // массив кодов ('own' | 'rent' | 'parents')
  car: '', // '' | 'yes' | 'no'
  employment: '', // '' | 'working' | 'not_working'
  goal: '', // '' | 'friendship' | 'date' | 'flirt' | 'relationship'
  kids: '', // '' | 'want' | 'have' | 'dont' | 'maybe'
  heightMin: '', // рост, см
  heightMax: '',
  smoking: '', // '' | 'no' | 'sometimes' | 'yes'
  drinking: '', // '' | 'no' | 'sometimes' | 'yes'
  verified: false, // true — только с подтверждённым фото
  sort: '', // '' — сейчас активны (по умолчанию) | 'new' — новенькие (Premium)
};

// Минимально допустимый возраст в приложении — младше нельзя нигде.
export const MIN_AGE = 18;
export const MAX_AGE = 100;

// Приводит введённый возраст к диапазону [18, 100].
// Пустая строка остаётся пустой (значит "не задано").
export function clampAge(raw) {
  if (raw === '' || raw == null) return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '';
  return String(Math.min(MAX_AGE, Math.max(MIN_AGE, Math.round(n))));
}

const STORAGE_KEY = 'feed-filters';

export function loadFilters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_FILTERS, ...JSON.parse(raw) } : { ...DEFAULT_FILTERS };
  } catch {
    return { ...DEFAULT_FILTERS };
  }
}

export function saveFilters(filters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* приватный режим и т.п. — не критично */
  }
}

// { ageMin: 20, city: 'Москва' }  ->  '?ageMin=20&city=Москва'
export function buildFeedQuery(f) {
  const p = new URLSearchParams();
  // Возраст всегда прогоняем через clampAge — меньше 18 в запрос не уйдёт.
  const ageMin = clampAge(f.ageMin);
  const ageMax = clampAge(f.ageMax);
  if (ageMin) p.set('ageMin', ageMin);
  if (ageMax) p.set('ageMax', ageMax);
  if (f.city.trim()) p.set('city', f.city.trim());
  if (f.gender) p.set('gender', f.gender);
  if (f.housing.length) p.set('housing', f.housing.join(','));
  if (f.car) p.set('car', f.car);
  if (f.employment) p.set('employment', f.employment);
  if (f.goal) p.set('goal', f.goal);
  if (f.kids) p.set('kids', f.kids);
  if (f.heightMin) p.set('heightMin', f.heightMin);
  if (f.heightMax) p.set('heightMax', f.heightMax);
  if (f.smoking) p.set('smoking', f.smoking);
  if (f.drinking) p.set('drinking', f.drinking);
  if (f.verified) p.set('verified', '1');
  if (f.sort) p.set('sort', f.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

// Есть ли хоть один активный фильтр (для индикатора на кнопке).
export function isFilterActive(f) {
  return buildFeedQuery(f) !== '';
}
