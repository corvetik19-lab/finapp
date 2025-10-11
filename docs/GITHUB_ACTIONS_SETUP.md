# Настройка GitHub Actions для автоматической генерации embeddings

## 📚 Что это?

GitHub Actions будет автоматически вызывать API генерации embeddings каждую ночь в 2:00 UTC (5:00 МСК).

Это **бесплатная альтернатива** CRON задаче Vercel (у которой есть лимит 2 задачи на free плане).

## 🔧 Настройка секретов

### 1. Откройте настройки репозитория

Перейдите в ваш репозиторий на GitHub:
```
https://github.com/corvetik19-lab/finapp
```

### 2. Добавьте секреты

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### Секрет 1: `CRON_SECRET`

- **Name:** `CRON_SECRET`
- **Value:** `f8e3c2a1d9b7e4f6a0c8d2e5b9f1a3c7`

(Это значение из вашего `.env.local`)

#### Секрет 2: `VERCEL_APP_URL`

- **Name:** `VERCEL_APP_URL`
- **Value:** `https://finappka.vercel.app`

(URL вашего приложения на Vercel)

### 3. Сохраните изменения

После добавления секретов они будут выглядеть так:

```
CRON_SECRET ••••••••••••••••
VERCEL_APP_URL ••••••••••••••••
```

## 🚀 Использование

### Автоматический запуск

Workflow запускается **автоматически каждую ночь в 2:00 UTC** (5:00 МСК).

### Ручной запуск

Можно запустить вручную:

1. Перейдите: **Actions** → **Generate AI Embeddings**
2. Нажмите **Run workflow**
3. Выберите branch: `main`
4. Нажмите **Run workflow**

## 📊 Проверка результатов

После запуска:

1. Откройте **Actions** в вашем репозитории
2. Найдите последний запуск **Generate AI Embeddings**
3. Откройте его и посмотрите логи

**Успешный результат:**
```
HTTP Status: 200
Response: {"success":true,"processed":15,"created":12,"skipped":3}
✅ Embeddings generated successfully
```

**Ошибка:**
```
HTTP Status: 401
Response: {"error":"Unauthorized"}
❌ Error: Failed to generate embeddings
```

Если ошибка 401 - проверьте правильность `CRON_SECRET`.

## 📝 Файл workflow

Файл находится в `.github/workflows/generate-embeddings.yml`

```yaml
name: Generate AI Embeddings

on:
  schedule:
    - cron: '0 2 * * *'  # Каждую ночь в 2:00 UTC
  workflow_dispatch:      # Ручной запуск

jobs:
  generate-embeddings:
    runs-on: ubuntu-latest
    steps:
      - name: Generate embeddings via API
        run: |
          curl -X GET "${{ secrets.VERCEL_APP_URL }}/api/ai/generate-embeddings" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## 🎯 Лимиты GitHub Actions

**Free план GitHub:**
- ✅ 2,000 минут/месяц
- ✅ Наш workflow: ~5 секунд/день = 2.5 минуты/месяц
- ✅ **Более чем достаточно!**

## ⚡ Преимущества

| Vercel CRON | GitHub Actions |
|-------------|----------------|
| ❌ Лимит 2 задачи | ✅ Без лимита задач |
| ❌ Платно за больше | ✅ 2000 минут бесплатно |
| ✅ Автоматически | ✅ Автоматически |
| ✅ Простая настройка | ✅ Простая настройка |

## 🔍 Troubleshooting

### Ошибка: "Unauthorized"

**Причина:** Неправильный `CRON_SECRET`

**Решение:** Проверьте значение в GitHub Secrets, оно должно совпадать с `CRON_SECRET` в Vercel Environment Variables.

### Ошибка: "404 Not Found"

**Причина:** Неправильный URL или endpoint не задеплоен

**Решение:** 
1. Проверьте `VERCEL_APP_URL` (должен быть `https://finappka.vercel.app`)
2. Убедитесь, что приложение задеплоено на Vercel
3. Проверьте, что файл `app/api/ai/generate-embeddings/route.ts` существует

### Workflow не запускается

**Причина:** Файл workflow ещё не в main ветке

**Решение:** Закоммитьте и запушьте файл `.github/workflows/generate-embeddings.yml`

---

## ✅ Готово!

После настройки embeddings будут генерироваться автоматически каждую ночь! 🎉
