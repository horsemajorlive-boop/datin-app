import { useState } from 'react';

// Планировщик встречи. Пользователь выбирает "что / когда / во сколько",
// а внизу собирается готовая фраза-приглашение, которую можно вставить в чат.
//
// Props:
//   onCancel  — закрыть планировщик
//   onCompose — готово: onCompose(текстСообщения)

const ACTIVITIES = [
  { label: 'кофе', emoji: '☕' },
  { label: 'прогулку', emoji: '🚶' },
  { label: 'кино', emoji: '🎬' },
  { label: 'выставку', emoji: '🖼️' },
  { label: 'бар', emoji: '🍸' },
  { label: 'каток', emoji: '⛸️' },
  { label: 'завтрак', emoji: '🥐' },
  { label: 'концерт', emoji: '🎶' },
];

const DAYS = ['сегодня', 'завтра', 'в выходные', 'на неделе'];
const TIMES = ['утром', 'днём', 'в 15:00', 'в 18:00', 'в 19:00', 'в 20:00', 'вечером'];

export default function DatePlanner({ onCancel, onCompose }) {
  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [day, setDay] = useState(DAYS[1]);
  const [time, setTime] = useState(TIMES[3]);

  // Собираем предложение из выбранных кусочков.
  const message = `Давай сходим на ${activity.label} ${day} ${time}? ${activity.emoji}`;

  return (
    <div className="planner">
      <p className="planner__title">Спланировать встречу</p>

      <div className="planner__row">
        {ACTIVITIES.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`chipbtn ${a.label === activity.label ? 'is-on' : ''}`}
            onClick={() => setActivity(a)}
          >
            {a.emoji} {a.label}
          </button>
        ))}
      </div>

      <div className="planner__row">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            className={`chipbtn ${d === day ? 'is-on' : ''}`}
            onClick={() => setDay(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="planner__row">
        {TIMES.map((t) => (
          <button
            key={t}
            type="button"
            className={`chipbtn ${t === time ? 'is-on' : ''}`}
            onClick={() => setTime(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <p className="planner__preview">{message}</p>

      <div className="planner__actions">
        <button className="btn-wide btn-wide--ghost" type="button" onClick={onCancel}>
          Отмена
        </button>
        <button className="btn-wide" type="button" onClick={() => onCompose(message)}>
          Вставить в чат
        </button>
      </div>
    </div>
  );
}
