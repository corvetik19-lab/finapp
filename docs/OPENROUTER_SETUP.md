# 🚀 Настройка OpenRouter

## Что такое OpenRouter?

**OpenRouter** — это единый API для доступа к сотням AI моделей от разных провайдеров:
- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet)
- Google (Gemini 2.0)
- Meta (Llama 3.1)
- Mistral AI
- Qwen, DeepSeek и многие другие

### Преимущества:
✅ **Один API ключ** для всех моделей  
✅ **Гибкое переключение** между моделями без изменения кода  
✅ **Конкурентные цены** и бесплатные модели  
✅ **Совместимость** с OpenAI SDK  
✅ **Автоматический фолбэк** при недоступности модели  

---

## 📝 Пошаговая настройка

### 1. Создайте аккаунт на OpenRouter

Перейдите на https://openrouter.ai/ и зарегистрируйтесь.

### 2. Получите API ключ

1. Откройте https://openrouter.ai/settings/keys
2. Нажмите **"Create Key"**
3. Введите название ключа (например: "FinApp Production")
4. **Важно:** Установите лимит расходов (Credit Limit) для безопасности
5. Скопируйте сгенерированный ключ

### 3. Добавьте ключ в переменные окружения

#### Для локальной разработки:

Создайте файл `.env.local`:

```bash
# OpenRouter API Key
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx

# URL вашего сайта (опционально, для рейтинга на openrouter.ai)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Для Vercel (Production):

1. Откройте настройки проекта на Vercel
2. Перейдите в **Settings → Environment Variables**
3. Добавьте:
   - **Key:** `OPENROUTER_API_KEY`
   - **Value:** ваш API ключ
   - **Environment:** Production, Preview, Development

### 4. Пополните баланс (опционально)

OpenRouter работает по модели Pay-as-you-go:
1. Откройте https://openrouter.ai/settings/credits
2. Пополните баланс ($5-10 хватит надолго)
3. Или используйте **бесплатные модели** (см. ниже)

---

## 🎯 Выбор моделей

Модели настраиваются в файле `lib/ai/openrouter.ts`:

```typescript
export const MODELS = {
  // Основная модель для команд (быстрая и дешёвая)
  COMMANDS: "openai/gpt-4o-mini",
  
  // Для сложного анализа и прогнозов
  ANALYTICS: "openai/gpt-4o",
}
```

### Рекомендуемые модели:

#### 💰 Для экономии:
```typescript
COMMANDS: "google/gemini-2.0-flash-exp:free"  // БЕСПЛАТНО
ANALYTICS: "openai/gpt-4o-mini"               // ~$0.15/1M токенов
```

#### ⚡ Для скорости:
```typescript
COMMANDS: "openai/gpt-4o-mini"               // Очень быстрая
ANALYTICS: "anthropic/claude-3.5-sonnet"     // Быстрая и точная
```

#### 🎯 Для качества:
```typescript
COMMANDS: "openai/gpt-4o"                    // Лучшая от OpenAI
ANALYTICS: "anthropic/claude-3.5-sonnet"     // Отличная для анализа
```

#### 🌍 Для русского языка:
```typescript
COMMANDS: "qwen/qwen-2.5-72b-instruct"       // Отлично понимает русский
ANALYTICS: "openai/gpt-4o"                   // Универсальная
```

### 🆓 Бесплатные модели:

- `google/gemini-2.0-flash-exp:free` - Gemini 2.0 Flash
- `meta-llama/llama-3.1-8b-instruct:free` - Llama 3.1 8B
- `mistralai/mistral-7b-instruct:free` - Mistral 7B

**Примечание:** Бесплатные модели имеют ограничения по скорости (rate limits).

---

## 📊 Мониторинг расходов

### В интерфейсе OpenRouter:

1. Откройте https://openrouter.ai/settings/usage
2. Смотрите:
   - Использование по моделям
   - Затраты по дням
   - Количество запросов
   - Детализацию по эндпоинтам

### В коде приложения:

Все AI запросы логируются в консоль при ошибках:
```typescript
console.error("AI analytics error:", error);
```

---

## 🔧 Продвинутая настройка

### Настройка лимитов:

В файле `lib/ai/openrouter.ts` можно добавить:

```typescript
export const openrouter = createOpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL,
    "X-Title": "FinApp",
    // Добавить дополнительные настройки:
    "X-Credit-Limit": "5.00", // Лимит $5 на запрос
  },
});
```

### Автоматический фолбэк:

Создайте функцию с несколькими моделями:

```typescript
export async function generateWithFallback(prompt: string) {
  const models = [
    "openai/gpt-4o-mini",
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.1-8b-instruct:free"
  ];
  
  for (const model of models) {
    try {
      return await generateText({
        model: openrouter(model),
        prompt,
      });
    } catch (error) {
      console.warn(`Model ${model} failed, trying next...`);
    }
  }
  
  throw new Error("All models failed");
}
```

---

## 🐛 Устранение неполадок

### Ошибка: "Invalid API Key"

**Решение:**
1. Проверьте, что ключ скопирован полностью
2. Убедитесь, что ключ начинается с `sk-or-v1-`
3. Перезапустите dev сервер после добавления `.env.local`

### Ошибка: "Insufficient credits"

**Решение:**
1. Пополните баланс на https://openrouter.ai/settings/credits
2. Или переключитесь на бесплатную модель (см. выше)

### Ошибка: "Rate limit exceeded"

**Решение:**
1. Используйте платную модель (выше лимиты)
2. Добавьте задержку между запросами
3. Оптимизируйте количество AI вызовов

### Медленные ответы

**Решение:**
1. Переключитесь на более быструю модель (gpt-4o-mini, gemini-flash)
2. Уменьшите `maxDuration` в API роутах
3. Используйте streaming для постепенного отображения

---

## 📚 Дополнительные ресурсы

- **Документация:** https://openrouter.ai/docs
- **Список моделей:** https://openrouter.ai/models
- **Цены:** https://openrouter.ai/models (в описании каждой модели)
- **Discord:** https://discord.gg/fVyRaUDgxW
- **Request Builder:** https://openrouter.ai/request-builder

---

## 💡 Советы по оптимизации

1. **Используйте разные модели для разных задач:**
   - Простые команды → `gpt-4o-mini` или `gemini-flash`
   - Сложный анализ → `gpt-4o` или `claude-3.5-sonnet`

2. **Кэшируйте результаты** для одинаковых запросов

3. **Оптимизируйте промпты** - короче = дешевле

4. **Мониторьте расходы** в dashboard OpenRouter

5. **Установите лимиты** для предотвращения перерасхода

---

**Готово!** 🎉 Теперь ваше приложение использует OpenRouter с доступом к сотням AI моделей!
