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
