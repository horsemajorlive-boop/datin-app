// Форматирование расстояния до анкеты + доступные радиусы поиска "рядом".
// Сама геопозиция запрашивается в telegram.js (requestLocation).

export const RADII_KM = [5, 15, 30, 50];

// 42 -> "42 км", 0 -> "рядом"
export function formatDistance(km) {
  if (km == null) return '';
  if (km < 1) return 'рядом';
  return `${km} км`;
}

// Город + расстояние вместе, только то, что реально есть: "Сочи · 4 км".
export function cityWithDistance(city, distanceKm) {
  const dist = formatDistance(distanceKm);
  if (city && dist) return `${city} · ${dist}`;
  return city || dist || '';
}
