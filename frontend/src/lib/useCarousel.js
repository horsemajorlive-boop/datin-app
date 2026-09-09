import { useState } from 'react';

// Свой "хук" — это функция, которая начинается с "use" и внутри пользуется
// другими хуками (здесь useState). В неё выносят переиспользуемую логику,
// чтобы не копировать её в каждый компонент.
//
// useCarousel хранит номер текущего фото и даёт функции перехода,
// не позволяя выйти за границы массива (0 … length-1).

export function useCarousel(length) {
  const [index, setIndex] = useState(0);

  // setIndex((i) => ...) — "обновление на основе прошлого значения".
  // Math.max(0, ...) не даёт уйти в минус, Math.min(last, ...) — за последний кадр.
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(Math.max(length - 1, 0), i + 1));

  return { index, prev, next };
}
