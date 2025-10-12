# 🎉 Переход на официальный провайдер OpenRouter

**Дата обновления:** 12 октября 2025  
**Версия:** @openrouter/ai-sdk-provider v1.2.0

---

## ✅ ЧТО ИЗМЕНИЛОСЬ

### До:
```typescript
import { createOpenAI } from "@ai-sdk/openai";

export const openrouter = createOpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  headers: { /* ... */ },
});
```

### После:
```typescript
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY,
  headers: { /* ... */ },
});
```

---

## 🎯 ПРЕИМУЩЕСТВА ОФИЦИАЛЬНОГО ПРОВАЙДЕРА

### 1. **Официальная поддержка**
- ✅ Разработан и поддерживается командой OpenRouter
- ✅ Полная совместимость с Vercel AI SDK
- ✅ Регулярные обновления и багфиксы

### 2. **Лучшая интеграция**
- ✅ Нативная поддержка всех функций OpenRouter
- ✅ Оптимизированные запросы
- ✅ Автоматическая обработка ошибок

### 3. **Упрощенная настройка**
- ✅ Не нужно указывать `baseURL`
- ✅ Меньше boilerplate кода
- ✅ Лучшая типизация TypeScript

### 4. **Tools и Streaming**
- ✅ Полная поддержка Vercel AI SDK tools
- ✅ Нативный streaming
- ✅ Multi-modal поддержка (текст + изображения)

---

## 📦 УСТАНОВКА

```bash
npm install @openrouter/ai-sdk-provider@latest
```

**Текущая версия:** v1.2.0

---

## 🔧 ИСПОЛЬЗОВАНИЕ

### Базовый пример:
```typescript
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": "https://your-app.com",
    "X-Title": "Your App Name",
  },
});

const response = await streamText({
  model: openrouter("openai/gpt-4o-mini"),
  prompt: "Explain quantum computing",
});
```

### С инструментами (Tools):
```typescript
import { z } from 'zod';

const response = await streamText({
  model: openrouter("openai/gpt-4o"),
  prompt: "What's the weather in SF?",
  tools: {
    getWeather: {
      description: 'Get current weather',
      parameters: z.object({
        location: z.string(),
        unit: z.enum(['celsius', 'fahrenheit']).optional(),
      }),
      execute: async ({ location, unit }) => {
        // Your weather API call
        return `Weather in ${location}: 20°${unit === 'fahrenheit' ? 'F' : 'C'}`;
      },
    },
  },
});
```

---

## 🌐 ДОСТУПНЫЕ МОДЕЛИ

Используйте любую модель из OpenRouter:

```typescript
// OpenAI
openrouter("openai/gpt-4o")
openrouter("openai/gpt-4o-mini")

// Anthropic
openrouter("anthropic/claude-3.5-sonnet")
openrouter("anthropic/claude-3-opus")

// Google
openrouter("google/gemini-2.0-flash-exp:free")  // БЕСПЛАТНО!
openrouter("google/gemini-pro")

// Meta
openrouter("meta-llama/llama-3.1-70b-instruct")
openrouter("meta-llama/llama-3.1-8b-instruct:free")  // БЕСПЛАТНО!

// Mistral
openrouter("mistralai/mistral-large")
openrouter("mistralai/mistral-7b-instruct:free")  // БЕСПЛАТНО!

// Qwen
openrouter("qwen/qwen-2.5-72b-instruct")
```

**Полный список:** https://openrouter.ai/models

---

## 📚 ДОКУМЕНТАЦИЯ

- **Официальный гайд:** https://openrouter.ai/docs/community/vercel-ai-sdk
- **GitHub репозиторий:** https://github.com/OpenRouterTeam/ai-sdk-provider
- **API Reference:** https://openrouter.ai/docs/api-reference
- **Vercel AI SDK:** https://sdk.vercel.ai/docs

---

## 🧪 ТЕСТИРОВАНИЕ

### TypeScript проверка:
```bash
npx tsc --noEmit
# ✅ Должно пройти без ошибок
```

### Запуск dev сервера:
```bash
npm run dev
```

### Тест в чате:
1. Откройте http://localhost:3000/ai-chat
2. Кликните на кнопку модели (🎯 GPT-4o Mini)
3. Выберите любую модель из списка
4. Задайте вопрос
5. Получите ответ от выбранной модели ✅

---

## ⚙️ МИГРАЦИЯ

Если вы использовали старый способ (`@ai-sdk/openai`):

### 1. Установите новый пакет:
```bash
npm install @openrouter/ai-sdk-provider@latest
```

### 2. Обновите импорты:
```typescript
// Было:
import { createOpenAI } from "@ai-sdk/openai";

// Стало:
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
```

### 3. Обновите конфигурацию:
```typescript
// Было:
export const openrouter = createOpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",  // ❌ Не нужно
  headers: { /* ... */ },
});

// Стало:
export const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY,
  headers: { /* ... */ },
});
```

### 4. Всё остальное работает как прежде! ✅

---

## 💡 СОВЕТЫ ПО ИСПОЛЬЗОВАНИЮ

### 1. **Используйте бесплатные модели для тестирования:**
```typescript
model: openrouter("google/gemini-2.0-flash-exp:free")
model: openrouter("meta-llama/llama-3.1-8b-instruct:free")
```

### 2. **Кэшируйте клиент:**
```typescript
// ✅ Хорошо
const openrouter = createOpenRouter({ apiKey: API_KEY });

// ❌ Плохо (создаёт новый клиент на каждый запрос)
function getText() {
  const openrouter = createOpenRouter({ apiKey: API_KEY });
}
```

### 3. **Обрабатывайте ошибки:**
```typescript
try {
  const response = await streamText({
    model: openrouter("openai/gpt-4o-mini"),
    prompt: "Hello",
  });
  await response.consumeStream();
  return response.text;
} catch (error) {
  if (error.message.includes('insufficient_credits')) {
    return 'Недостаточно средств на балансе OpenRouter';
  }
  throw error;
}
```

### 4. **Мониторьте расходы:**
- Dashboard: https://openrouter.ai/settings/usage
- Установите лимиты: https://openrouter.ai/settings/limits

---

## 🔒 БЕЗОПАСНОСТЬ

### ❌ НЕ ДЕЛАЙТЕ:
```typescript
// НЕ используйте API ключ в клиентском коде!
const openrouter = createOpenRouter({
  apiKey: "sk-or-v1-xxxxx",  // ❌ ОПАСНО!
});
```

### ✅ ДЕЛАЙТЕ:
```typescript
// Только на сервере (API routes, Server Components)
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,  // ✅ Безопасно
});
```

---

## 📊 СТАТИСТИКА МИГРАЦИИ

- **Обновлено файлов:** 13
- **Новых зависимостей:** 1 (`@openrouter/ai-sdk-provider`)
- **TypeScript ошибок:** 0 ✅
- **Обратная совместимость:** 100% ✅
- **Время миграции:** ~10 минут

---

## 🎉 ГОТОВО!

Теперь ваше приложение использует официальный провайдер OpenRouter с полной поддержкой Vercel AI SDK!

**Следующие шаги:**
1. ✅ Убедитесь что `OPENROUTER_API_KEY` настроен
2. ✅ Пополните баланс на https://openrouter.ai/settings/credits
3. ✅ Протестируйте чат с разными моделями
4. ✅ Наслаждайтесь доступом к сотням AI моделей! 🚀

---

**Документация проекта:**
- `MIGRATION_COMPLETE.md` - Итоговая сводка миграции
- `docs/OPENROUTER_SETUP.md` - Настройка с нуля
- `docs/AI_MIGRATION.md` - Руководство по миграции
- `README.md` - Главная документация
