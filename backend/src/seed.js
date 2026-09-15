// Наполняет базу тестовыми анкетами, чтобы в ленте было кого листать.
// Запуск: npm run seed  (можно много раз — записи не дублируются).

import { db } from './db.js';
import { upsertUser, saveProfile, setPhotos, recordSwipe } from './models.js';

const MINUTE = 60 * 1000;

// id для тестовых "ботов" — большие числа, чтобы не пересечься с реальными.
const BOTS = [
  {
    id: 900001,
    first_name: 'Аня',
    profile: {
      name: 'Аня', age: 24, city: 'Москва', gender: 'f',
      bio: 'Люблю горы, кофе по утрам и настолки. Ищу того, с кем можно и помолчать, и посмеяться.',
      interests: ['Горы', 'Кофе', 'Настолки', 'Походы', 'Кемпинг'],
      housing: 'rent', car: 'no', employment: 'working',
      goal: 'relationship', kids: 'want',
      height: 168, weight: 54, smoking: 'no', drinking: 'sometimes',
    },
    photos: ['anya', 'anya-b', 'anya-c'],
    likesYou: true,
    verified: true,
  },
  {
    id: 900002,
    first_name: 'Лера',
    profile: {
      name: 'Лера', age: 27, city: 'Санкт-Петербург', gender: 'f',
      bio: 'Архитектор. Рисую, бегаю по утрам вдоль Невы, коллекционирую виниловые пластинки.',
      interests: ['Архитектура', 'Бег', 'Винил', 'Музыка', 'Искусство'],
      housing: 'own', car: 'yes', employment: 'working',
      goal: 'relationship', kids: 'maybe',
      height: 175, weight: 62, smoking: 'no', drinking: 'no',
    },
    photos: ['lera', 'lera-b'],
  },
  {
    id: 900003,
    first_name: 'Марина',
    profile: {
      name: 'Марина', age: 22, city: 'Казань', gender: 'f',
      bio: 'Студентка-биолог. Обожаю котов, документалки про природу и долгие прогулки.',
      interests: ['Биология', 'Кошки', 'Документалки', 'Природа', 'Волонтёрство в приютах'],
      housing: 'parents', car: 'no', employment: 'not_working',
      goal: 'friendship', kids: 'maybe',
      height: 162, weight: 50, smoking: 'sometimes', drinking: 'sometimes',
    },
    photos: ['marina'],
    likesYou: true,
  },
  {
    id: 900004,
    first_name: 'Соня',
    profile: {
      name: 'Соня', age: 29, city: 'Екатеринбург', gender: 'f',
      bio: 'Фотограф. Была в 30 странах, следующая — Япония. Ищу компаньона по путешествиям.',
      interests: ['Фотография', 'Путешествия', 'Языки', 'Кино', 'Вино'],
      housing: 'own', car: 'yes', employment: 'working',
      goal: 'flirt', kids: 'dont',
      height: 171, weight: 58, smoking: 'no', drinking: 'sometimes',
    },
    photos: ['sonya'],
    verified: true,
  },
  {
    id: 900005,
    first_name: 'Катя',
    profile: {
      name: 'Катя', age: 25, city: 'Новосибирск', gender: 'f',
      bio: 'Программистка. Готовлю пасту лучше, чем пишу код (а код пишу неплохо). Люблю иронию.',
      interests: ['Технологии', 'Готовка', 'Мемы', 'Видеоигры', 'Книги'],
      housing: 'rent', car: 'no', employment: 'working',
      goal: 'relationship', kids: 'want',
      height: 165, weight: 55, smoking: 'no', drinking: 'no',
    },
    photos: ['katya'],
    verified: true,
  },
  {
    id: 900006,
    first_name: 'Даша',
    profile: {
      name: 'Даша', age: 26, city: 'Сочи', gender: 'f',
      bio: 'Инструктор по сёрфингу. Море — это вся моя жизнь. Научу тебя ловить волну.',
      interests: ['Сёрфинг', 'Море', 'Йога', 'Плавание', 'Путешествия'],
      housing: 'rent', car: 'yes', employment: 'working',
      goal: 'date', kids: 'maybe',
      height: 173, weight: 60, smoking: 'yes', drinking: 'yes',
    },
    photos: ['dasha'],
    likesYou: true,
  },
];

// 50 дополнительных анкет из Москвы (женский пол) — генерируем, а не пишем
// руками, чтобы получить разнообразие без 50 одинаковых карточек.
const MOSCOW_NAMES = [
  'Анна', 'Мария', 'Елена', 'Ольга', 'Татьяна', 'Наталья', 'Ирина', 'Светлана', 'Юлия', 'Екатерина',
  'Анастасия', 'Виктория', 'Дарья', 'Полина', 'Алина', 'Кристина', 'Валерия', 'Ангелина', 'Софья', 'Вероника',
  'Маргарита', 'Алиса', 'Диана', 'Милана', 'Ева', 'Арина', 'Есения', 'Ксения', 'Элина', 'Алёна',
  'Инна', 'Лилия', 'Жанна', 'Регина', 'Оксана', 'Зоя', 'Нина', 'Тамара', 'Раиса', 'Людмила',
  'Галина', 'Алла', 'Вера', 'Лариса', 'Надежда', 'Марта', 'Эмилия', 'Стефания', 'Злата', 'Агата',
];

const MOSCOW_INTEREST_POOL = [
  'Бег', 'Йога', 'Плавание', 'Танцы', 'Горы', 'Путешествия', 'Кемпинг', 'Кино', 'Музыка', 'Концерты',
  'Театр', 'Музеи', 'Фотография', 'Книги', 'Кофе', 'Вино', 'Готовка', 'Рестораны', 'Настолки', 'Видеоигры',
  'Шахматы', 'Мода', 'Рукоделие', 'Вязание', 'Психология', 'Медитация', 'Велосипед', 'Ролики', 'Стендап', 'Йога',
];

const MOSCOW_PROFESSIONS = [
  'маркетологом', 'дизайнером', 'юристом', 'врачом', 'учителем', 'бухгалтером', 'менеджером',
  'фотографом', 'психологом', 'архитектором', 'визажистом', 'переводчиком', 'HR-менеджером',
  'копирайтером', 'SMM-специалистом',
];

const MOSCOW_BIO_TEMPLATES = [
  (p, h1, h2) => `Живу в Москве, работаю ${p}. Свободное время трачу на ${h1.toLowerCase()} и ${h2.toLowerCase()}.`,
  (p, h1, h2) => `Москвичка, ${p} по профессии. Обожаю ${h1.toLowerCase()}, а по выходным — ${h2.toLowerCase()}.`,
  (p, h1, h2) => `Работаю ${p}, живу в самом центре Москвы. Люблю ${h1.toLowerCase()}, увлекаюсь ${h2.toLowerCase()}.`,
  (p, h1, h2) => `Немного ${p}, немного мечтатель. ${h1} и ${h2.toLowerCase()} — моя отдушина.`,
  (p, h1, h2) => `${h1} и ${h2.toLowerCase()} — это про меня. А ещё работаю ${p} и обожаю свой город.`,
];

const HOUSING_OPTS = ['own', 'rent', 'parents'];
const CAR_OPTS = ['yes', 'no'];
const EMPLOYMENT_OPTS = ['working', 'not_working'];
const GOAL_OPTS = ['relationship', 'friendship', 'flirt', 'date'];
const KIDS_OPTS = ['want', 'have', 'dont', 'maybe'];
const SMOKE_DRINK_OPTS = ['no', 'sometimes', 'yes'];

const MOSCOW_BOTS = MOSCOW_NAMES.map((name, idx) => {
  const age = 19 + (idx % 20); // 19..38
  const prof = MOSCOW_PROFESSIONS[idx % MOSCOW_PROFESSIONS.length];
  const h1 = MOSCOW_INTEREST_POOL[idx % MOSCOW_INTEREST_POOL.length];
  const h2 = MOSCOW_INTEREST_POOL[(idx + 7) % MOSCOW_INTEREST_POOL.length];
  const h3 = MOSCOW_INTEREST_POOL[(idx + 13) % MOSCOW_INTEREST_POOL.length];
  const bio = MOSCOW_BIO_TEMPLATES[idx % MOSCOW_BIO_TEMPLATES.length](prof, h1, h2);

  return {
    id: 900100 + idx + 1,
    first_name: name,
    profile: {
      name, age, city: 'Москва', gender: 'f',
      bio,
      interests: [...new Set([h1, h2, h3])],
      housing: HOUSING_OPTS[idx % HOUSING_OPTS.length],
      car: CAR_OPTS[idx % CAR_OPTS.length],
      employment: EMPLOYMENT_OPTS[idx % EMPLOYMENT_OPTS.length],
      goal: GOAL_OPTS[idx % GOAL_OPTS.length],
      kids: KIDS_OPTS[idx % KIDS_OPTS.length],
      height: 158 + (idx % 20),
      weight: 48 + (idx % 25),
      smoking: SMOKE_DRINK_OPTS[idx % SMOKE_DRINK_OPTS.length],
      drinking: SMOKE_DRINK_OPTS[(idx + 1) % SMOKE_DRINK_OPTS.length],
    },
    photos: [`moscow-bot-${idx + 1}`],
    likesYou: idx % 9 === 0,
    verified: idx % 4 === 0,
  };
});

const ALL_BOTS = [...BOTS, ...MOSCOW_BOTS];

// Кому боты "уже поставили лайк" — чтобы получился мэтч, когда вы лайкнете в ответ.
const DEV_USER_ID = Number(process.env.SEED_TARGET || 1);

const photoUrl = (seed) => `https://picsum.photos/seed/${seed}/600/800`;

// Заводим dev-пользователя, чтобы на него можно было сослаться в свайпах (внешний ключ).
upsertUser({ id: DEV_USER_ID, first_name: 'Dev', username: 'dev' });

const DAY = 24 * 60 * MINUTE;

ALL_BOTS.forEach((bot, i) => {
  upsertUser({ id: bot.id, first_name: bot.first_name, username: null });
  saveProfile(bot.id, bot.profile);
  setPhotos(bot.id, bot.photos.map(photoUrl));

  // Присутствие: те, кто "лайкнул вас", — сейчас онлайн; остальные заходили недавно.
  const lastSeen = bot.likesYou
    ? Date.now()
    : Date.now() - Math.round((5 + Math.random() * 175)) * MINUTE;
  db.prepare(`UPDATE users SET last_seen_at = ? WHERE id = ?`).run(lastSeen, bot.id);

  // Дата регистрации — с разбросом, чтобы работала сортировка "новенькие".
  const createdAt = Date.now() - i * 3 * DAY;
  db.prepare(`UPDATE users SET created_at = ? WHERE id = ?`).run(createdAt, bot.id);

  // Боты уже "прошли вход" — иначе не попадут в ленту.
  db.prepare(`UPDATE users SET terms_accepted_at = ? WHERE id = ?`).run(createdAt, bot.id);

  // Часть ботов — с "золотой галочкой", чтобы фильтр "только подтверждённые" работал.
  if (bot.verified) {
    db.prepare(`UPDATE users SET verified_at = ? WHERE id = ?`).run(createdAt, bot.id);
  }

  if (bot.likesYou) {
    // бот лайкает dev-пользователя; сам dev-пользователь ещё не свайпал,
    // поэтому мэтча пока нет — он появится после ответного лайка.
    recordSwipe(bot.id, DEV_USER_ID, 'like');
  }
});

console.log(
  `[seed] добавлено анкет: ${ALL_BOTS.length} (в т.ч. ${MOSCOW_BOTS.length} из Москвы). ` +
    `Лайкнули dev-пользователя #${DEV_USER_ID}: ` +
    ALL_BOTS.filter((b) => b.likesYou).map((b) => b.first_name).join(', ')
);
