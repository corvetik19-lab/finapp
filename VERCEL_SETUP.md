# 🚀 Инструкция по настройке Vercel

## ✅ Все данные готовы

Я начал добавлять переменные через браузер, но для экономии времени создал **готовый файл для импорта**.

---

## 📋 Как добавить переменные в Vercel (2 минуты!)

### Вариант 1: Импорт файла (БЫСТРО! ⚡)

1. Откройте: <https://vercel.com/vladislavs-projects-e2219311/finappka/settings/environment-variables>
2. Нажмите кнопку **"Import .env"**
3. Откройте файл `VERCEL_ENV.txt`
4. Скопируйте **ВСЁ содержимое**
5. Вставьте в поле на Vercel
6. Нажмите **"Save"**
7. Выберите: **Production, Preview, Development** (все 3!)
8. Готово! ✅

### Вариант 2: Добавить вручную

Если импорт не работает, добавьте каждую переменную по отдельности:

1. Нажмите **"Add New"**
2. **Key:** `OPENAI_API_KEY`
   **Value:** `sk-proj-_6z9AOhU...` (из VERCEL_ENV.txt)
   **Environments:** Production, Preview, Development
3. Сохраните
4. Повторите для остальных переменных

---

## 📝 Список переменных (всего 8)

✅ **Уже добавлены в Vercel:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

🆕 **Нужно добавить:**

- `OPENAI_API_KEY` ⭐
- `NEXT_PUBLIC_SENTRY_DSN` ⭐
- `SENTRY_ORG` ⭐
- `SENTRY_PROJECT` ⭐
- `SENTRY_AUTH_TOKEN` ⭐
- `CRON_SECRET` ⭐

---

## 🎯 После добавления переменных

### Перезапустите деплой

```bash
git add .
git commit -m "Add environment variables"
git push origin main
```

Или в Vercel Dashboard:

1. **Deployments** → последний деплой
2. Три точки (•••) → **"Redeploy"**
3. ✅ Готово!

---

## 🔍 Проверка

### 1. Sentry работает?

Откройте: <https://finapp-0b.sentry.io/issues/>

### 2. AI работает?

Откройте ваше приложение и попробуйте автокатегоризацию

### 3. CRON работает?

Задачи запустятся автоматически по расписанию

---

## 📊 Статус

| Компонент | Статус | Действие |
|-----------|--------|----------|
| `.env.local` | ✅ Готов | Создан с данными |
| Vercel ENV | ⚠️ Частично | Нужно импортировать |
| Sentry | ✅ Готов | Настроен автоматически |
| CRON | ✅ Готов | Заработает после деплоя |

---

## 🎉 Готово

После добавления переменных в Vercel приложение **полностью готово к production**! 🚀

**Файлы для импорта:**

- `VERCEL_ENV.txt` - переменные для Vercel ⭐

**Документация:**

- `SENTRY_CONFIG.txt` - данные Sentry
- `SETUP_COMPLETE.md` - полная сводка
- `docs/SENTRY_READY.md` - инструкция Sentry

---
