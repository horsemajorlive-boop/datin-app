// Каталог подсказок анкеты — вместо голого поля "о себе" пользователь
// выбирает несколько вопросов и коротко отвечает. Коды должны совпадать
// с PROMPT_CODES в backend/src/models.js.

export const PROMPTS = [
  { code: 'ideal_date', question: 'Идеальное первое свидание — это' },
  { code: 'two_truths', question: 'Два правды и одна ложь обо мне' },
  { code: 'talk_about', question: 'Я никогда не устаю говорить о' },
  { code: 'sunday', question: 'Моё обычное воскресное утро' },
  { code: 'looking_for', question: 'Ищу человека, который' },
  { code: 'spontaneous', question: 'Самое спонтанное, что я делал(а)' },
  { code: 'cant_live', question: 'Три вещи, без которых не могу жить' },
  { code: 'talent', question: 'Мой скрытый талант' },
  { code: 'perfect_evening', question: 'Идеальный вечер для меня' },
  { code: 'fun_fact', question: 'Малоизвестный факт обо мне' },
  { code: 'green_flag', question: 'Мой главный плюс как партнёра' },
  { code: 'win_heart', question: 'Быстрее всего покорить моё сердце можно, если' },
];

export const promptQuestion = (code) => PROMPTS.find((p) => p.code === code)?.question || '';

export const MAX_PROMPTS = 3;
export const PROMPT_ANSWER_MAX = 150;
