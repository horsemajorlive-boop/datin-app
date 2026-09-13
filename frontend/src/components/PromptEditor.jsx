import { PROMPTS, MAX_PROMPTS, PROMPT_ANSWER_MAX } from '../data/prompts';
import { IconX } from './icons';

// Редактор подсказок анкеты: до MAX_PROMPTS пар "вопрос из каталога + короткий
// ответ" — вместо голого текстового поля "о себе". С подсказками у мэтча
// сразу есть, с чего начать разговор.
//
// Props:
//   value    — [{ code, answer }]
//   onChange — onChange(следующий массив)

export default function PromptEditor({ value, onChange }) {
  const usedCodes = value.map((p) => p.code);

  function availableFor(currentCode) {
    return PROMPTS.filter((p) => p.code === currentCode || !usedCodes.includes(p.code));
  }

  function updateAnswer(code, answer) {
    onChange(value.map((p) => (p.code === code ? { ...p, answer } : p)));
  }

  function changeQuestion(oldCode, newCode) {
    onChange(value.map((p) => (p.code === oldCode ? { code: newCode, answer: p.answer } : p)));
  }

  function remove(code) {
    onChange(value.filter((p) => p.code !== code));
  }

  function addPrompt() {
    const free = PROMPTS.find((p) => !usedCodes.includes(p.code));
    if (free) onChange([...value, { code: free.code, answer: '' }]);
  }

  return (
    <div className="prompts-editor">
      {value.length === 0 && (
        <p className="muted prompts-editor__hint">
          Пока ни одной подсказки — с ними анкету охотнее открывают и есть с чего начать разговор.
        </p>
      )}

      {value.map((p) => (
        <div className="prompt-card" key={p.code}>
          <button
            type="button"
            className="prompt-card__remove"
            onClick={() => remove(p.code)}
            aria-label="Удалить подсказку"
          >
            <IconX />
          </button>

          <label className="field prompt-card__field">
            <span>Вопрос</span>
            <select value={p.code} onChange={(e) => changeQuestion(p.code, e.target.value)}>
              {availableFor(p.code).map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.question}
                </option>
              ))}
            </select>
          </label>

          <label className="field prompt-card__field">
            <span>Ответ</span>
            <textarea
              rows={2}
              value={p.answer}
              onChange={(e) => updateAnswer(p.code, e.target.value.slice(0, PROMPT_ANSWER_MAX))}
              placeholder="Коротко, в одно-два предложения"
            />
            <span className="field__hint">{p.answer.length}/{PROMPT_ANSWER_MAX}</span>
          </label>
        </div>
      ))}

      {value.length < MAX_PROMPTS && (
        <button type="button" className="btn-wide btn-wide--ghost prompts-editor__add" onClick={addPrompt}>
          Добавить подсказку
        </button>
      )}
    </div>
  );
}
