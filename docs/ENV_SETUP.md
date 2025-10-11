# Настройка переменных окружения

## 🚀 Быстрый старт

### 1. Скопировать шаблон

```bash
cp .env.local.example .env.local
```

### 2. Заполнить обязательные переменные

Откройте `.env.local` и замените значения:

```env
# ⭐ ОБЯЗАТЕЛЬНО
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-key
CRON_SECRET=your-random-token

# 📦 ОПЦИОНАЛЬНО (для production)
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_ORG=your-org
SENTRY_PROJECT=finapp
SENTRY_AUTH_TOKEN=sntrys_...
```

### 3. Перезапустить сервер

```bash
npm run dev
```

---

## 📋 Получение ключей

### Supabase (обязательно)

1. Зайдите в [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите проект → **Settings** → **API**
3. Скопируйте:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ секретный!)

### OpenAI API (обязательно)

1. Зайдите в [OpenAI Platform](https://platform.openai.com)
2. **API keys** → **Create new secret key**
3. Скопируйте ключ → `OPENAI_API_KEY`
4. ⚠️ Ключ показывается только раз! Сохраните его.

**Стоимость:**
- Автокатегоризация: ~$0.075 за 1000 транзакций
- Ежемесячные инсайты: ~$0.01 на пользователя
- Embeddings: ~$0.02 за 1000 транзакций

### CRON Secret (обязательно для production)

Сгенерировать случайный токен:

```bash
# В терминале (Linux/Mac):
openssl rand -hex 32

# В PowerShell (Windows):
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

Или используйте онлайн: [generate-secret.now.sh/32](https://generate-secret.now.sh/32)

### Sentry (опционально, но рекомендуется)

1. Зайдите в [Sentry.io](https://sentry.io)
2. **Create Project** → выберите **Next.js**
3. Скопируйте **DSN** → `NEXT_PUBLIC_SENTRY_DSN`
4. **Settings** → **Auth Tokens** → **Create New Token**
   - Scopes: `project:releases`, `project:write`
   - Скопируйте → `SENTRY_AUTH_TOKEN`
5. **Settings** → **General**
   - Organization Slug → `SENTRY_ORG`
   - Project Name → `SENTRY_PROJECT`

**Стоимость:**
- Free: 5,000 ошибок/месяц
- Developer: $29/мес (50,000 ошибок)

---

## 🚀 Настройка на Vercel

### 1. Добавить переменные окружения

1. Зайдите в **Vercel Dashboard**
2. Выберите проект → **Settings** → **Environment Variables**
3. Добавьте все переменные из `.env.local`
4. Для каждой выберите окружения:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

### 2. Важные моменты

**Не добавлять в Vercel:**
- ❌ `SUPABASE_SERVICE_ROLE_KEY` (используйте только локально или в CRON)

**Обязательно добавить:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `CRON_SECRET`

**Опционально:**
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

### 3. Redeploy

После добавления переменных:

```bash
git push
```

Или в Vercel Dashboard: **Deployments** → **Redeploy**

---

## ⚠️ Безопасность

### ✅ DO (делать):

- ✅ Храните `.env.local` **только локально**
- ✅ Используйте разные ключи для dev/prod
- ✅ Генерируйте длинные случайные `CRON_SECRET`
- ✅ Ротируйте ключи раз в 3-6 месяцев
- ✅ Добавляйте переменные в Vercel через UI (не в коде!)

### ❌ DON'T (не делать):

- ❌ Не коммитьте `.env.local` в Git
- ❌ Не используйте простые CRON_SECRET типа "secret123"
- ❌ Не публикуйте ключи в issues/screenshots
- ❌ Не используйте один и тот же OpenAI ключ везде
- ❌ Не храните `service_role` ключ в клиентском коде

---

## 🧪 Проверка настройки

### Проверить Supabase:

```bash
# Запустить dev сервер
npm run dev

# Открыть http://localhost:3000/login
# Если форма входа работает → Supabase настроен ✅
```

### Проверить OpenAI:

```bash
# Открыть http://localhost:3000/ai-chat
# Отправить сообщение
# Если ответ приходит → OpenAI настроен ✅
```

### Проверить CRON Secret:

```bash
# Вызвать CRON endpoint с правильным токеном
curl -X GET http://localhost:3000/api/ai/generate-embeddings \
  -H "Authorization: Bearer your-cron-secret"

# Если 200 OK → настроен правильно ✅
# Если 401 Unauthorized → проверьте токен
```

### Проверить Sentry:

```bash
# Открыть http://localhost:3000/test-sentry (если создали)
# Нажать "Test Error"
# Проверить Sentry Dashboard
# Если ошибка появилась → Sentry настроен ✅
```

---

## 🔄 Обновление ключей

### Если ключ скомпрометирован:

1. **Supabase:**
   - Settings → API → Reset key
   - Обновить в `.env.local` и Vercel

2. **OpenAI:**
   - Platform → API keys → Revoke key
   - Create new key
   - Обновить в `.env.local` и Vercel

3. **Sentry:**
   - Settings → Auth Tokens → Revoke token
   - Create new token
   - Обновить в `.env.local` и Vercel

4. **CRON Secret:**
   - Сгенерировать новый: `openssl rand -hex 32`
   - Обновить в `.env.local` и Vercel

После обновления → **Redeploy** на Vercel!

---

## 📚 Дополнительная документация

- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Статус:** ✅ Готово к использованию  
**Версия:** 1.0  
**Дата:** 2025-10-11
