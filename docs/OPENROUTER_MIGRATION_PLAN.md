# План миграции ИИ Студия: Gemini → OpenRouter

## Обзор

Полная замена Google Gemini API на OpenRouter API в режиме "ИИ Студия" для решения проблемы гео-блокировки.

## Преимущества OpenRouter

- **400+ моделей** через единый API (GPT-4o, Claude, Llama, Mistral, Gemini и др.)
- **Нет гео-блокировок** - работает из любого региона
- **OpenAI-совместимый API** - простая интеграция
- **Streaming** - SSE поддержка из коробки
- **Tool Calling** - function calling для поддерживаемых моделей
- **Unified pricing** - единая система тарификации

## Файлы для изменения

### 1. Клиент API (основа)
- `lib/ai-studio/gemini/client.ts` → `lib/ai-studio/openrouter/client.ts`
- Новый клиент с поддержкой streaming и tool calling

### 2. Конфигурация моделей
- `lib/ai-studio/models.ts` - заменить Gemini модели на OpenRouter модели
- Добавить динамическую загрузку списка моделей через API

### 3. API Routes
- `app/api/ai-studio/chat/stream/route.ts` - основной streaming endpoint
- Адаптировать под OpenRouter формат

### 4. Компоненты UI (без изменения дизайна)
- `app/(protected)/ai-studio/components/ModelSelector.tsx` - список моделей
- `app/(protected)/ai-studio/chat/page.tsx` - страница чата

### 5. Сервисы инструментов
- `lib/ai-studio/tools/service.ts` - адаптировать TTS, транскрибацию и др.

## Архитектура OpenRouter

### API Endpoint
```
POST https://openrouter.ai/api/v1/chat/completions
```

### Headers
```typescript
{
  "Authorization": "Bearer <OPENROUTER_API_KEY>",
  "HTTP-Referer": "<YOUR_SITE_URL>",
  "X-Title": "<YOUR_SITE_NAME>",
  "Content-Type": "application/json"
}
```

### Request Format
```typescript
{
  model: "openai/gpt-4o",  // или любая другая модель
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "..." },
    { role: "assistant", content: "..." }
  ],
  stream: true,
  temperature: 0.7,
  max_tokens: 4096,
  tools?: [...],  // function calling
  tool_choice?: "auto"
}
```

### Streaming Response (SSE)
```
data: {"id":"...","choices":[{"delta":{"content":"Hello"}}]}
data: {"id":"...","choices":[{"delta":{"content":" world"}}]}
data: [DONE]
```

## Популярные модели OpenRouter

### Flagship Models
| ID | Название | Описание |
|----|----------|----------|
| `openai/gpt-4o` | GPT-4o | Мультимодальная модель OpenAI |
| `anthropic/claude-3.5-sonnet` | Claude 3.5 Sonnet | Быстрая и умная модель Anthropic |
| `google/gemini-2.0-flash-001` | Gemini 2.0 Flash | Быстрая модель Google |
| `meta-llama/llama-3.3-70b-instruct` | Llama 3.3 70B | Open-source модель Meta |
| `deepseek/deepseek-chat` | DeepSeek V3 | Мощная open-source модель |

### Reasoning Models
| ID | Название | Описание |
|----|----------|----------|
| `openai/o1` | O1 | Модель с глубоким мышлением |
| `anthropic/claude-3.5-sonnet` | Claude 3.5 | Рассуждения и анализ |
| `deepseek/deepseek-r1` | DeepSeek R1 | Open-source reasoning |

### Fast & Cheap Models
| ID | Название | Описание |
|----|----------|----------|
| `openai/gpt-4o-mini` | GPT-4o Mini | Быстрая и дешёвая |
| `anthropic/claude-3-haiku` | Claude 3 Haiku | Сверхбыстрая |
| `google/gemini-flash-1.5` | Gemini Flash | Быстрая Google |
| `meta-llama/llama-3.1-8b-instruct` | Llama 3.1 8B | Лёгкая open-source |

### Vision Models
| ID | Название | Описание |
|----|----------|----------|
| `openai/gpt-4o` | GPT-4o | Анализ изображений |
| `anthropic/claude-3.5-sonnet` | Claude 3.5 | Vision + анализ |
| `google/gemini-2.0-flash-001` | Gemini 2.0 | Мультимодальность |

## Этапы реализации

### Этап 1: Создание клиента OpenRouter
1. Создать `lib/ai-studio/openrouter/client.ts`
2. Реализовать базовые функции: chat, stream, models
3. Добавить поддержку tool calling

### Этап 2: Обновление конфигурации моделей
1. Обновить `lib/ai-studio/models.ts`
2. Добавить API для получения списка моделей
3. Сгруппировать по категориям

### Этап 3: Обновление API Routes
1. Переписать `app/api/ai-studio/chat/stream/route.ts`
2. Использовать OpenRouter streaming
3. Сохранить формат SSE ответов

### Этап 4: Обновление UI компонентов
1. Обновить ModelSelector для новых моделей
2. Обновить тексты (Gemini → OpenRouter)
3. Сохранить весь дизайн

### Этап 5: Адаптация инструментов
1. TTS - использовать модели с audio output
2. Транскрибация - использовать Whisper через OpenRouter
3. Генерация изображений - DALL-E или другие

## Переменные окружения

```env
# Старые (удалить)
GEMINI_API_KEY=...
GOOGLE_PROJECT_ID=...
GOOGLE_LOCATION=...

# Новые
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_SITE_URL=https://finapp.vercel.app
OPENROUTER_SITE_NAME=Finapp AI Studio
```

## Тестирование

1. Проверить streaming работает
2. Проверить все модели доступны
3. Проверить tool calling работает
4. Проверить обработку ошибок
5. Проверить отмену запросов

## Откат

В случае проблем можно вернуться на Gemini:
- Сохранить старые файлы в `lib/ai-studio/gemini-backup/`
- Использовать feature flag для переключения

---

**Статус:** Готов к реализации
**Дата:** 2024-12-23
