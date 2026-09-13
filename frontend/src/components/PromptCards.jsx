import { promptQuestion } from '../data/prompts';

// Ответы на подсказки анкеты — каждая отдельной карточкой: вопрос мелко
// сверху, ответ крупнее снизу. Заменяет собой голое поле "о себе".
//
// Props:
//   prompts — [{ code, answer }]

export default function PromptCards({ prompts }) {
  if (!prompts?.length) return null;
  return (
    <div className="promptcards">
      {prompts.map((p) => (
        <div className="promptcard" key={p.code}>
          <p className="promptcard__q">{promptQuestion(p.code)}</p>
          <p className="promptcard__a">{p.answer}</p>
        </div>
      ))}
    </div>
  );
}
