# Finapp — финансовый трекер с ИИ‑аналитикой

![Finapp cover](./public/og-image.png)


## Описание

Finapp — это веб‑приложение для управления личными финансами. Пользователь может вести дебетовые карты, Кубышки (стэш‑счета), планы накоплений, импортировать/экспортировать транзакции и получать подсказки от искусственного интеллекта. Интерфейс создаётся по макетам из каталога `dizain/`.

## Возможности

### Дебетовые карты

- Управление балансом, Кубышкой и быстрыми действиями (`app/(protected)/cards`).

### Пополнения и переводы

- Модальные окна с валидацией и подтверждающими уведомлениями.

### Supabase интеграция

- Postgres + RLS, аутентификация по magic link.

### ИИ‑анализ

- Серверные вызовы OpenAI для автокатегоризации и инсайтов (в разработке, см. `lib/ai/`).

### CSV импорт/экспорт

- Через PapaParse (`lib/csv/`).

### PWA

- Манифест и сервис‑воркер на базе `next-pwa` (готовится).

## Технологический стек

- Next.js 14 (App Router) + TypeScript
- React Hook Form + Zod
- Supabase (Auth, Postgres, Storage, pgvector)
- Chart.js / `react-chartjs-2`
- Vitest + Playwright
- next-pwa, PapaParse, OpenAI API

## Структура проекта

```text
├─ app/
│  ├─ (protected)/cards/        # Страница дебетовых карт и модалки
│  ├─ (protected)/layout.tsx    # Общий layout приватных разделов
│  └─ api/                      # Служебные маршруты и server actions
├─ components/                  # Переиспользуемые UI-компоненты
├─ lib/
│  ├─ supabase/                 # Клиенты, вспомогательные функции
│  ├─ ai/                       # Работа с OpenAI (сервер)
│  └─ csv/                      # Импорт/экспорт через PapaParse
├─ db/
│  ├─ migrations/               # SQL-миграции
│  └─ seeds/                    # Сиды данных
├─ public/                      # Статика, иконки, PWA-манифест
├─ styles/                      # Глобальные стили и CSS modules
└─ tests/                       # Vitest и Playwright тесты
```

## Подготовка окружения

### Предварительные требования

- Node.js ≥ 18
- npm ≥ 9 (или pnpm/yarn/bun при желании)
- [Git for Windows](https://git-scm.com/download/win)
- Учётная запись [Supabase](https://supabase.com/) и созданный проект
- API‑ключ OpenAI (для `lib/ai/`)

### Переменные окружения

Создайте файл `.env.local` на основе примера:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
```

В локальной разработке сервисный ключ можно не указывать, если не выполняются фоновые задания.

### Настройка базы данных

1. Установите [Supabase CLI](https://supabase.com/docs/guides/cli/local-development).
2. Примените миграции:

   ```bash
   supabase db push
   ```

3. Включите расширения: `pgvector`, `moddatetime`.
4. Убедитесь, что политики RLS активированы согласно `db/policies/*.sql`.

## Запуск проекта

```bash
npm install
npm run dev
```

Приложение будет доступно на `http://localhost:3000`. Все защищённые маршруты находятся в `app/(protected)` и требуют авторизации через Supabase Auth.

## Скрипты

- `npm run dev` — запуск дев-сервера Next.js
- `npm run build` — сборка
- `npm run start` — запуск production-сборки
- `npm run lint` — линтинг
- `npm run test` — юнит-тесты Vitest
- `npm run test:e2e` — e2e-тесты Playwright

## Дизайн и UX

Все макеты и HTML-прототипы лежат в `dizain/`. Реализуя новые разделы (`/reports`, `/plans`, `/loans` и т.д.), ориентируйтесь на соответствующие файлы из этого каталога.

## Дорожная карта

- Реализовать полнофункциональные отчёты (`/reports`): фильтры, графики, экспорт CSV.
- Добавить планы/цели (`/plans`) с CRUD и прогрессом.
- Настроить раздел кредитов/долгов (`/loans`, `/debts`).
- Интегрировать PWA и push-уведомления.
- Подключить Sentry для мониторинга.

## Развёртывание

Рекомендуемый способ — [Vercel](https://vercel.com/). Перед деплоем:

- Настройте переменные окружения в Vercel.
- Добавьте Supabase проект (URL и ключи) и OpenAI API ключ.
- Убедитесь, что база данных мигрирована и RLS-правила соответствуют продакшену.

## Вклад

1. Сделайте форк репозитория.
2. Создайте ветку: `git checkout -b feature/name`.
3. Внесите изменения и запустите тесты.
4. Создайте Pull Request.

## Лицензия

Проект распространяется на условиях MIT. Подробности см. в файле `LICENSE`.
