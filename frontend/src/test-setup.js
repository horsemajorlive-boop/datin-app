// Общая настройка для тестов компонентов (React Testing Library):
// - jest-dom матчеры (toBeInTheDocument и т.п.) для vitest's expect;
// - автоочистка DOM между тестами, чтобы один тест не видел разметку другого;
// - jsdom не реализует Pointer Capture API — ProfileCard (свайп карточек)
//   вызывает setPointerCapture на каждый pointerdown, без заглушки тесты
//   падали бы с "is not a function".

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
}

afterEach(() => {
  cleanup();
});
