# Приложение для знакомств (Telegram Mini App)

Учебный проект: строим приложение знакомств для Telegram с нуля.

## Структура

```
frontend/   — веб-приложение (Vite + React), то, что видит пользователь
backend/    — API-сервер (Express + SQLite), хранит анкеты, свайпы, мэтчи, чаты
```

## Как запустить

Нужен установленный Node.js 22+ (`node --version`).

### Backend (API)

```bash
cd backend
npm install
cp .env.example .env      # затем впишите BOT_TOKEN, если есть
npm run seed              # наполнить базу тестовыми анкетами
npm run dev               # запуск на http://localhost:3001
```

Проверка: открыть `http://localhost:3001/api/health` — должно вернуть `{"ok":true}`.

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

## Авторизация

Внутри Telegram мини-приложение присылает подписанные данные `initData`,
сервер проверяет подпись токеном бота (`BOT_TOKEN` в `backend/.env`).

Для локальной разработки без Telegram в `.env` стоит `ALLOW_DEV_AUTH=true`:
фронтенд шлёт заголовок `X-Dev-User: <id>`, и сервер верит ему.
На проде это надо выключить.

## База данных

SQLite, файл `backend/data.db` (в git не попадает). Схема — `backend/src/schema.sql`,
применяется автоматически при старте сервера. Запросы пишутся вручную на SQL
(модуль `node:sqlite`, встроен в Node — ничего компилировать не нужно).

Чтобы начать с чистой базы: удалить `backend/data.db` и снова выполнить `npm run seed`.

## Деплой (Railway)

Один сервис отдаёт и API, и собранный фронтенд — второй хостинг не нужен,
CORS тоже (всё с одного домена). В корне репозитория есть `package.json`
с `build`/`start` для Railway (или любого другого Nixpacks-хостинга).

1. **Создайте проект на [railway.app](https://railway.app/)** и подключите
   этот git-репозиторий.
2. **Добавьте Volume** (постоянный диск) и смонтируйте его, например, на
   `/app/data`. Без этого база и загруженные фото будут пропадать при
   каждом редеплое.
3. **Переменные окружения** (Settings → Variables):
   - `BOT_TOKEN` — токен от @BotFather.
   - `DATA_DIR=/app/data` — тот же путь, что и Volume выше.
   - `TELEGRAM_WEBHOOK_SECRET` — придумайте случайную строку (для оплаты Stars).
   - `MINI_APP_URL` — узнаете на шаге 5, впишите после первого деплоя.
   - `ADMIN_IDS` — свой telegram-id, если нужен гарантированный вход в админку.
   - `ALLOW_DEV_AUTH` и `CORS_ORIGIN` — **не задавайте** (или явно `false`/
     конкретный домен): значения из `.env.example` — только для localhost.
   - `PORT` Railway подставляет сам, руками не трогайте.
4. Railway сам увидит корневой `package.json`, соберёт фронтенд и запустит
   `backend/src/server.js` (`npm run build` → `npm start`). После первого
   деплоя Railway выдаст домен вида `https://<имя>.up.railway.app`.
5. **Подключите домен к боту:**
   - Впишите URL из шага 4 в `MINI_APP_URL` (Railway передеплоит сам).
   - У @BotFather: `/mybots` → ваш бот → `Bot Settings` → `Menu Button` →
     укажите тот же URL — это и есть кнопка запуска мини-приложения.
   - Для оплаты Premium (Stars) один раз вызовите Bot API, чтобы Telegram
     слал вебхуки на ваш сервер:
     ```bash
     curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
       -d "url=https://<ваш-домен>/telegram/webhook" \
       -d "secret_token=<тот же TELEGRAM_WEBHOOK_SECRET>"
     ```

Проверить, что всё поднялось: `https://<ваш-домен>/api/health` → `{"ok":true}`.
