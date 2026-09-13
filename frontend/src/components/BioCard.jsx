// Свободный текст "о себе" — той же карточкой, что и ответы на подсказки
// (см. PromptCards), просто с постоянной подписью вместо вопроса из каталога.
// Голым текстом на экране это смотрелось потерянно.
//
// Props:
//   text — profile.bio

export default function BioCard({ text }) {
  if (!text) return null;
  return (
    <div className="promptcards">
      <div className="promptcard">
        <p className="promptcard__q">О себе</p>
        <p className="promptcard__a">{text}</p>
      </div>
    </div>
  );
}
