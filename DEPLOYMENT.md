# 🚀 Руководство по деплою FinApp на Vercel

Пошаговая инструкция для развёртывания приложения в production.

## 📋 Предварительные требования

- Аккаунт на [Vercel](https://vercel.com)
- Аккаунт на [Supabase](https://supabase.com) с созданным проектом
- API ключ [OpenRouter](https://openrouter.ai/keys)
- Telegram бот токен (опционально, для уведомлений)
- GitHub репозиторий с кодом

---

## 🗄️ Шаг 1: Настройка базы данных Supabase

### 1.1 Создайте проект в Supabase
1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Дождитесь завершения инициализации

### 1.2 Примените миграции
```bash
# Установите Supabase CLI
npm install -g supabase

# Авторизуйтесь
supabase login

# Свяжите с проектом
supabase link --project-ref your-project-ref

# Примените миграции
supabase db push
```

### 1.3 Включите расширения
В SQL Editor выполните:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS moddatetime;
```

### 1.4 Проверьте RLS политики
Убедитесь что Row Level Security включена для всех таблиц:
```sql
-- Проверка
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## 🔑 Шаг 2: Получение API ключей

### 2.1 Supabase
1. Project Settings → API
2. Скопируйте:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (только для CRON задач)

### 2.2 OpenRouter
1. Перейдите на [openrouter.ai/keys](https://openrouter.ai/keys)
2. Создайте новый API ключ
3. Пополните баланс ($5-10 хватит надолго)
4. Скопируйте ключ → `OPENROUTER_API_KEY`

### 2.3 Telegram Bot (опционально)
1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен → `TELEGRAM_BOT_TOKEN`

### 2.4 Sentry (опционально)
1. Создайте проект на [sentry.io](https://sentry.io)
2. Скопируйте DSN → `NEXT_PUBLIC_SENTRY_DSN`

---

## 🌐 Шаг 3: Деплой на Vercel

### 3.1 Подключите репозиторий
1. Перейдите на [vercel.com](https://vercel.com)
2. Нажмите "Add New Project"
3. Импортируйте GitHub репозиторий
4. Выберите Framework Preset: **Next.js**

### 3.2 Настройте переменные окружения
В разделе "Environment Variables" добавьте:

#### Обязательные:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
OPENROUTER_API_KEY=sk-or-v1-...
```

#### Для CRON задач:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

#### Для Telegram:
```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
```

#### Для Sentry:
```env
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=your-auth-token
```

### 3.3 Настройте Build & Output Settings
- **Build Command:** `npm run build` (по умолчанию)
- **Output Directory:** `.next` (по умолчанию)
- **Install Command:** `npm install` (по умолчанию)

### 3.4 Задеплойте
1. Нажмите "Deploy"
2. Дождитесь завершения сборки (2-3 минуты)
3. Проверьте что нет ошибок в логах

---

## ⚙️ Шаг 4: Настройка CRON задач

### 4.1 Включите CRON в Vercel
1. Project Settings → Cron Jobs
2. Убедитесь что `vercel.json` содержит конфигурацию CRON

### 4.2 Проверьте настройки в `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/monthly-insights",
      "schedule": "0 9 1 * *"
    },
    {
      "path": "/api/cron/smart-notifications",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### 4.3 Настройте Vercel Cron Authentication
Добавьте в Environment Variables:
```env
CRON_SECRET=your-random-secret-string
```

---

## 🤖 Шаг 5: Настройка Telegram бота

### 5.1 Установите webhook
После деплоя выполните:
```bash
curl -X POST \
  "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-app.vercel.app/api/telegram/webhook"
```

### 5.2 Проверьте webhook
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Ответ должен содержать:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-app.vercel.app/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## ✅ Шаг 6: Проверка работоспособности

### 6.1 Основные проверки
- [ ] Открывается главная страница
- [ ] Работает аутентификация (magic link)
- [ ] Создаются транзакции
- [ ] Работают графики на дашборде
- [ ] AI чат отвечает на вопросы
- [ ] Экспорт PDF/Excel скачивает файлы
- [ ] Telegram бот отвечает на команды

### 6.2 Проверьте логи
1. Vercel Dashboard → Deployments → Logs
2. Проверьте нет ли ошибок
3. Проверьте что AI запросы проходят успешно

### 6.3 Проверьте мониторинг
Если настроен Sentry:
1. Перейдите в Sentry Dashboard
2. Убедитесь что нет критичных ошибок
3. Настройте алерты при необходимости

---

## 🔧 Шаг 7: Post-deployment настройки

### 7.1 Настройте кастомный домен (опционально)
1. Project Settings → Domains
2. Добавьте свой домен
3. Настройте DNS записи у регистратора

### 7.2 Оптимизация производительности
1. Включите Edge Caching
2. Настройте Image Optimization
3. Проверьте Lighthouse score

### 7.3 Безопасность
1. Убедитесь что все секретные ключи в Environment Variables
2. Проверьте что RLS политики работают
3. Настройте CORS если нужно

---

## 🐛 Troubleshooting

### Ошибка: "Database connection failed"
**Решение:** Проверьте `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Ошибка: "OpenRouter API key invalid"
**Решение:** 
1. Проверьте ключ на [openrouter.ai/keys](https://openrouter.ai/keys)
2. Убедитесь что баланс > 0
3. Проверьте что ключ добавлен как `OPENROUTER_API_KEY`

### Ошибка: "Telegram webhook failed"
**Решение:**
1. Проверьте что `TELEGRAM_BOT_TOKEN` корректен
2. Убедитесь что webhook URL правильный
3. Проверьте логи `/api/telegram/webhook`

### AI не отвечает в чате
**Решение:**
1. Проверьте баланс OpenRouter
2. Проверьте логи в Vercel
3. Убедитесь что модель доступна (например, `google/gemini-2.0-flash-001:free`)

### CRON задачи не выполняются
**Решение:**
1. Проверьте что plan включает CRON (Hobby plan и выше)
2. Проверьте `vercel.json` конфигурацию
3. Добавьте `CRON_SECRET` в Environment Variables

---

## 📊 Мониторинг и поддержка

### Vercel Analytics
Включите для отслеживания:
- Page views
- Unique visitors
- Performance metrics

### Vercel Speed Insights
Отслеживайте:
- Core Web Vitals
- LCP, FID, CLS
- Performance по страницам

### Supabase Dashboard
Мониторьте:
- Database size
- API requests
- Active connections
- Storage usage

### OpenRouter Dashboard
Отслеживайте:
- API usage
- Costs
- Model performance

---

## 🔄 Continuous Deployment

### Автоматический деплой
При каждом push в `main`:
1. Vercel автоматически деплоит
2. Запускается build
3. Прогоняются проверки
4. Деплоится новая версия

### Preview deployments
При создании Pull Request:
1. Создаётся preview deployment
2. Получаете уникальный URL для тестирования
3. После merge - автодеплой в production

---

## 📈 Масштабирование

### При росте нагрузки:
1. **Vercel**: обновите план до Pro для лучшей производительности
2. **Supabase**: обновите план при необходимости больше connections
3. **OpenRouter**: следите за балансом и лимитами
4. **Edge Functions**: используйте для критичных операций

---

## ✅ Чеклист перед go-live

- [ ] Все environment variables настроены
- [ ] База данных мигрирована
- [ ] RLS политики проверены
- [ ] OpenRouter API работает (баланс > 0)
- [ ] Telegram бот отвечает
- [ ] CRON задачи настроены
- [ ] Тестирование по `TESTING_CHECKLIST.md` пройдено
- [ ] Sentry настроен (опционально)
- [ ] Custom domain настроен (опционально)
- [ ] Analytics включён
- [ ] Документация актуальна

---

## 🎉 Готово!

Ваше приложение теперь доступно по адресу:
`https://your-app.vercel.app`

Поздравляем с запуском! 🚀

---

**Нужна помощь?**
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Next.js Documentation](https://nextjs.org/docs)

**Версия:** v1.0  
**Дата:** 2025-10-19
