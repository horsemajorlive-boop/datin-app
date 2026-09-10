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
  sort: '', // '' — сейчас активны (по умолчанию) | 'new' — новенькие (Premium)
};

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
  if (f.ageMin) p.set('ageMin', f.ageMin);
  if (f.ageMax) p.set('ageMax', f.ageMax);
  if (f.city.trim()) p.set('city', f.city.trim());
  if (f.gender) p.set('gender', f.gender);
  if (f.housing.length) p.set('housing', f.housing.join(','));
  if (f.car) p.set('car', f.car);
  if (f.employment) p.set('employment', f.employment);
  if (f.sort) p.set('sort', f.sort);
  const s = p.toString();
  return s ? `?${s}` : '';
}

// Есть ли хоть один активный фильтр (для индикатора на кнопке).
export function isFilterActive(f) {
  return buildFeedQuery(f) !== '';
}
