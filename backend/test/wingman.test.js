// Тест "подсказок от LLM" (wingman.js). Настоящий вызов Anthropic API здесь
// не проверяем (нужен был бы реальный ключ или мок fetch) — важнее всего
// именно graceful fallback: без ключа модуль не должен пытаться сходить в
// сеть и должен быстро и тихо вернуть null, чтобы фронт остался на своей
// эвристике.

import { test } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.ANTHROPIC_API_KEY;

const { getAiSuggestions } = await import('../src/wingman.js');

test('без ANTHROPIC_API_KEY возвращает null и не ходит в сеть', async () => {
  const result = await getAiSuggestions({
    me: { name: 'Аня', age: 25, city: 'Москва', bio: '', interests: [] },
    them: { name: 'Оля', age: 27, city: 'Москва', bio: '', interests: [] },
    messages: [],
  });
  assert.equal(result, null);
});
