# MebliAI Working App

Робоча версія AI-застосунку для меблів під замовлення.

## Що працює

- Завантаження фото кімнати або камера.
- Опис бажаної кухні.
- Розміри стіни, висота, глибина.
- Технічні точки: вода, розетки, газ.
- Матеріали, фасади, стільниця, фурнітура, LED, монтаж.
- Орієнтовний прорахунок.
- AI-візуалізація:
  - без `OPENAI_API_KEY` працює демо-режим;
  - з `OPENAI_API_KEY` сервер пробує реальну генерацію через OpenAI Responses API.
- Збереження заявок у `data/leads.json`.
- CRM екран менеджера.

## Локальний запуск

```bash
npm start
```

Потім відкрити:

```text
http://localhost:8787
```

## Змінні середовища

Скопіювати `.env.example` в `.env` або задати змінні на хостингу:

```text
OPENAI_API_KEY=...
PORT=8787
OPENAI_TEXT_MODEL=gpt-5
```

## Деплой

Це Node.js app без зовнішніх залежностей. Його можна ставити на Render, Railway, Fly.io, VPS або будь-який Node-хостинг.

Команда запуску:

```bash
npm start
```

Build command не потрібен.

### Render

1. Завантажити папку в GitHub репозиторій.
2. У Render створити `New Web Service`.
3. Підключити репозиторій.
4. Start command: `npm start`.
5. Health check path: `/api/health`.
6. Environment variables:
   - `OPENAI_API_KEY`
   - `OPENAI_TEXT_MODEL=gpt-5`

У папці вже є `render.yaml`, тому Render може підхопити конфіг автоматично.

### Railway

1. Створити новий project.
2. Deploy from GitHub repo.
3. Додати `OPENAI_API_KEY` у Variables.
4. Railway використає `railway.json` і `npm start`.

### Docker / VPS

```bash
docker build -t mebliai .
docker run -p 8787:8787 -e OPENAI_API_KEY=your_key mebliai
```

## Важливо для production

Зараз заявки зберігаються у файл `data/leads.json`. Для першого тесту цього достатньо.
Для production краще підключити базу даних: Supabase, Postgres, SQLite volume або CRM webhook.
