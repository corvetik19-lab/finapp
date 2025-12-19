# 🔧 Настройка переменных окружения

## Шаг 1: Создайте файл `.env.local`

В корне проекта создайте файл `.env.local` (рядом с `.env.example`)

## Шаг 2: Скопируйте содержимое

Скопируйте содержимое из `.env.example` в `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenRouter AI (замена OpenAI)
# Получите ключ на: https://openrouter.ai/settings/keys
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# Telegram Bot (опционально)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Site Info (опционально, для рейтинга на openrouter.ai)
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

## Шаг 3: Заполните значения

### **Обязательные:**

1. **NEXT_PUBLIC_SUPABASE_URL** - URL вашего Supabase проекта
   - Найти: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY** - Публичный ключ (anon key)
   - Найти: там же, в разделе "Project API keys"

3. **SUPABASE_SERVICE_ROLE_KEY** - Service Role Key (секретный)
   - Найти: там же, но это **секретный ключ** (не публикуйте!)

4. **OPENROUTER_API_KEY** - API ключ OpenRouter для AI функций
   - Получить: https://openrouter.ai/settings/keys
   - Создайте аккаунт → Settings → Keys → "Create Key"

### **Опциональные:**

5. **TELEGRAM_BOT_TOKEN** - для интеграции с Telegram ботом
6. **NEXT_PUBLIC_SITE_URL** - URL вашего сайта

## Шаг 4: Перезапустите сервер

После создания `.env.local` перезапустите dev сервер:

```bash
# Остановите текущий (Ctrl+C)
# Запустите заново
npm run dev
```

---

## ✅ Проверка

Откройте в браузере:
```
http://localhost:3000/api/ai/test
```

Должно показать:
```json
{
  "status": "ok",
  "hasOpenRouterKey": true,
  "message": "✅ OpenRouter API key настроен"
}
```

---

## ❌ Частые ошибки

### "OPENROUTER_API_KEY not configured"
- Проверьте, что файл называется точно `.env.local`
- Проверьте, что ключ начинается с `sk-or-v1-`
- Перезапустите сервер после изменений

### "Failed to build"
- Убедитесь, что нет пробелов в ключах
- Проверьте, что файл в кодировке UTF-8
- Попробуйте удалить `.next` папку и пересобрать

---

## 🔐 Безопасность

⚠️ **ВАЖНО:**
- Файл `.env.local` уже добавлен в `.gitignore`
- **НЕ** коммитьте секретные ключи в Git
- **НЕ** публикуйте `SUPABASE_SERVICE_ROLE_KEY`
- Используйте разные ключи для dev/production
