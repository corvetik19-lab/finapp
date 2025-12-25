# План интеграции OpenRouter в режим Финансы

## Обзор

Полная миграция с Google Gemini API на OpenRouter для режима "Финансы". OpenRouter обходит гео-блокировку и предоставляет единый API для доступа к множеству моделей.

**API Key OpenRouter (Finance)**: `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`

> ⚠️ **ВАЖНО**: Режим "ИИ Студия" использует свой отдельный API ключ OpenRouter. Режим "Финансы" получает собственный ключ.

---

## 1. Архитектура решения

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Клиент        │────▶│  Next.js API     │────▶│  OpenRouter     │
│   (Браузер)     │     │  Routes          │     │  API            │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Supabase DB     │     │  google/gemini  │
                        │  (pgvector)      │     │  openai/...     │
                        └──────────────────┘     └─────────────────┘
```

### Преимущества OpenRouter:
- ✅ Нет гео-блокировки (работает из любой страны)
- ✅ Единый API для всех моделей
- ✅ OpenAI-совместимый формат
- ✅ Tool Calling, Streaming, Structured Outputs
- ✅ Cost Tracking и Analytics
- ✅ Fallback на альтернативные провайдеры

---

## 2. Жёстко заданные модели (НЕ настраиваемые)

### 2.1 Модель для чата (Chat/Reasoning)

```typescript
// ЖЁСТКО ПРОПИСАНА - НЕ МЕНЯТЬ!
export const OPENROUTER_CHAT_MODEL = "google/gemini-2.5-flash-preview-05-20" as const;
```

**Обоснование выбора:**
- Gemini 2.5 Flash - быстрая модель с отличным reasoning
- Поддержка Function Calling (Tool Calling)
- Поддержка Streaming
- Оптимальное соотношение цена/качество

### 2.2 Модель для Embeddings

```typescript
// ЖЁСТКО ПРОПИСАНА - НЕ МЕНЯТЬ!
export const OPENROUTER_EMBEDDING_MODEL = "openai/text-embedding-3-large" as const;
export const EMBEDDING_DIMENSIONS = 3072; // Максимальная точность
```

**Обоснование выбора:**
- text-embedding-3-large - лучшая модель embeddings от OpenAI
- 3072 dimensions - максимальная точность для RAG
- Совместима с pgvector в Supabase

---

## 3. OpenRouter API Reference

### 3.1 Endpoint
```
POST https://openrouter.ai/api/v1/chat/completions
```

### 3.2 Headers
```typescript
{
  "Authorization": "Bearer sk-or-v1-...",
  "HTTP-Referer": "https://finapp.vercel.app", // Для статистики
  "X-Title": "FinApp Finance",                  // Название в дашборде
  "Content-Type": "application/json"
}
```

### 3.3 Request Body (с Tool Calling)
```typescript
{
  model: "google/gemini-2.5-flash-preview-05-20",
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "..." },
    { role: "assistant", content: "...", tool_calls: [...] },
    { role: "tool", tool_call_id: "...", content: "..." }
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "getAccountBalance",
        description: "Получить баланс счетов",
        parameters: {
          type: "object",
          properties: { ... },
          required: [...]
        }
      }
    }
  ],
  tool_choice: "auto", // или "none", или { type: "function", function: { name: "..." } }
  stream: true,
  temperature: 0.7,
  max_tokens: 4096
}
```

### 3.4 Response (Tool Call)
```typescript
{
  id: "gen-...",
  model: "google/gemini-2.5-flash-preview-05-20",
  choices: [{
    index: 0,
    message: {
      role: "assistant",
      content: null,
      tool_calls: [{
        id: "call_...",
        type: "function",
        function: {
          name: "getAccountBalance",
          arguments: "{\"accountName\": \"all\"}"
        }
      }]
    },
    finish_reason: "tool_calls"
  }],
  usage: {
    prompt_tokens: 150,
    completion_tokens: 25,
    total_tokens: 175
  }
}
```

### 3.5 Embeddings
```typescript
// OpenRouter использует тот же формат что OpenAI
POST https://openrouter.ai/api/v1/embeddings

{
  model: "openai/text-embedding-3-large",
  input: "Текст для векторизации",
  dimensions: 3072 // опционально
}

// Response
{
  data: [{
    embedding: [0.123, -0.456, ...], // 3072 чисел
    index: 0
  }],
  usage: { prompt_tokens: 10, total_tokens: 10 }
}
```

---

## 4. Файловая структура

### 4.1 Новые файлы
```
lib/ai/
├── openrouter-client.ts      # OpenRouter клиент для финансов
├── openrouter-embeddings.ts  # Embeddings через OpenRouter
├── openrouter-tools.ts       # Конвертация tools в OpenRouter формат
└── finance-agent.ts          # Агент с RAG и Tool Calling
```

### 4.2 Файлы для удаления/замены
```
lib/ai/
├── gemini-client.ts          # УДАЛИТЬ или переименовать в .backup
├── embeddings.ts             # ЗАМЕНИТЬ на openrouter-embeddings.ts
└── convert-tools.ts          # ОБНОВИТЬ для OpenRouter формата
```

### 4.3 Файлы для обновления
```
app/api/ai/chat/route.ts              # Использовать OpenRouter
app/api/ai/embeddings/generate/route.ts # Использовать OpenRouter
lib/ai/rag-pipeline.ts                # Обновить импорты
```

---

## 5. Реализация

### 5.1 OpenRouter Client (`lib/ai/openrouter-client.ts`)

```typescript
/**
 * OpenRouter Client для режима Финансы
 * 
 * ВАЖНО: Модели жёстко заданы и НЕ должны меняться!
 */

// Жёстко заданные модели
export const OPENROUTER_CHAT_MODEL = "google/gemini-2.5-flash-preview-05-20" as const;
export const OPENROUTER_EMBEDDING_MODEL = "openai/text-embedding-3-large" as const;
export const EMBEDDING_DIMENSIONS = 3072;

// Типы
export interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenRouterToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface OpenRouterToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenRouterTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  tools?: OpenRouterTool[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: OpenRouterMessage;
    finish_reason: "stop" | "tool_calls" | "length";
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Клиент
class OpenRouterFinanceClient {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor() {
    const key = process.env.OPENROUTER_FINANCE_API_KEY;
    if (!key) {
      throw new Error("OPENROUTER_FINANCE_API_KEY not configured");
    }
    this.apiKey = key;
  }

  private getHeaders() {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://finapp.vercel.app",
      "X-Title": "FinApp Finance",
      "Content-Type": "application/json",
    };
  }

  async chat(request: Omit<OpenRouterRequest, "model">): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        ...request,
        model: OPENROUTER_CHAT_MODEL,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter error: ${error}`);
    }

    return response.json();
  }

  async chatStream(request: Omit<OpenRouterRequest, "model" | "stream">): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        ...request,
        model: OPENROUTER_CHAT_MODEL,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter error: ${error}`);
    }

    return response.body!;
  }

  async createEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: OPENROUTER_EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter embedding error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: OPENROUTER_EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter embedding error: ${error}`);
    }

    const data = await response.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
  }
}

// Singleton
let client: OpenRouterFinanceClient | null = null;

export function getOpenRouterClient(): OpenRouterFinanceClient {
  if (!client) {
    client = new OpenRouterFinanceClient();
  }
  return client;
}

// Вспомогательные функции
export function getChatModel() {
  return OPENROUTER_CHAT_MODEL;
}

export function getEmbeddingsModel() {
  return OPENROUTER_EMBEDDING_MODEL;
}

export function getEmbeddingDimension() {
  return EMBEDDING_DIMENSIONS;
}
```

### 5.2 Tools Converter (`lib/ai/openrouter-tools.ts`)

```typescript
/**
 * Конвертация Zod схем в формат OpenRouter/OpenAI Tools
 */

import { aiTools, toolSchemas } from "./tools";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { OpenRouterTool } from "./openrouter-client";

export function convertToolsToOpenRouter(): OpenRouterTool[] {
  const tools: OpenRouterTool[] = [];

  for (const [toolName, toolDef] of Object.entries(aiTools)) {
    const schema = toolSchemas[toolName as keyof typeof toolSchemas];
    if (!schema) continue;

    const jsonSchema = zodToJsonSchema(schema as any, toolName) as Record<string, unknown>;

    tools.push({
      type: "function",
      function: {
        name: toolName,
        description: toolDef.description,
        parameters: {
          type: "object",
          properties: (jsonSchema.properties as Record<string, unknown>) || {},
          required: (jsonSchema.required as string[]) || [],
        },
      },
    });
  }

  return tools;
}
```

---

## 6. Финансовые инструменты (Tools)

### 6.1 Аналитика и отчёты
| Tool | Описание |
|------|----------|
| `getFinancialSummary` | Сводка за период (доходы/расходы/баланс) |
| `getExpensesByCategory` | Расходы по категориям |
| `getAccountBalance` | Баланс счетов |
| `getTransactions` | Список транзакций |
| `getTopCategories` | Топ категорий по расходам |
| `getMonthlyTrends` | Тренды по месяцам |
| `getSpendingByMonth` | Расходы по месяцам |

### 6.2 Управление данными
| Tool | Описание |
|------|----------|
| `addTransaction` | Добавить транзакцию |
| `addCategory` | Создать категорию |
| `addBudget` | Создать бюджет |
| `addPlan` | Создать план накоплений |
| `addDebitCard` | Добавить дебетовую карту |
| `addCreditCard` | Добавить кредитную карту |

### 6.3 Расширенная аналитика (AI)
| Tool | Описание |
|------|----------|
| `detectAnomalies` | Выявление аномалий в расходах |
| `searchTransactions` | RAG поиск по транзакциям |

---

## 7. RAG Pipeline

### 7.1 Архитектура
```
Запрос пользователя
        │
        ▼
┌───────────────────┐
│ Создать embedding │  ← OpenRouter text-embedding-3-large
│ для запроса       │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Поиск в pgvector  │  ← Supabase match_transactions()
│ похожих транзакций│
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Формирование      │
│ контекста         │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Отправка в LLM    │  ← OpenRouter gemini-2.5-flash
│ с контекстом      │
└───────────────────┘
        │
        ▼
     Ответ AI
```

### 7.2 Supabase Function для поиска
```sql
-- Функция для семантического поиска транзакций
CREATE OR REPLACE FUNCTION match_transactions(
  query_embedding vector(3072),  -- 3072 для text-embedding-3-large
  match_threshold float,
  match_count int,
  filter_user_id uuid
)
RETURNS TABLE (
  id uuid,
  note text,
  amount_minor bigint,
  currency text,
  occurred_at timestamptz,
  category_id uuid,
  account_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.note,
    t.amount,
    t.currency,
    t.occurred_at,
    t.category_id,
    t.account_id,
    1 - (t.embedding <=> query_embedding) as similarity
  FROM transactions t
  WHERE t.user_id = filter_user_id
    AND t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 7.3 Обновление размерности embedding в БД
```sql
-- Изменить размерность вектора с 768 на 3072
ALTER TABLE transactions 
ALTER COLUMN embedding TYPE vector(3072);
```

---

## 8. Environment Variables

```bash
# .env.local (НЕ коммитить!)

# OpenRouter API Key для режима Финансы
OPENROUTER_FINANCE_API_KEY=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

# Для OpenAI embeddings напрямую (опционально, если OpenRouter не поддерживает)
# OPENAI_API_KEY=sk-...
```

---

## 9. Этапы реализации

### Этап 1: Создание OpenRouter клиента ✅
- [x] Создать `lib/ai/openrouter-client.ts` ✅
- [x] Создать `lib/ai/convert-tools.ts` (tools конвертер) ✅
- [x] Добавить env variable `OPENROUTER_FINANCE_API_KEY` ✅

### Этап 2: Обновление Embeddings ✅
- [x] Создать `lib/ai/openrouter-embeddings.ts` ✅
- [x] Обновить размерность в Supabase (768 → 3072) ✅
- [x] Обновить `match_transactions` функцию ✅

### Этап 3: Обновление Chat API ✅
- [x] Переписать `app/api/ai/chat/route.ts` ✅
- [x] Использовать OpenRouter вместо Gemini ✅
- [x] Сохранить Tool Calling логику ✅
- [x] Добавить поддержку `reasoning_details` для Gemini 3 ✅

### Этап 4: Удаление Gemini кода ✅
- [x] Удалить `lib/ai/gemini-client.ts` ✅
- [x] Удалить `lib/ai/embeddings.ts` ✅
- [x] Обновить импорты во всех файлах на `openrouter-embeddings` ✅
- [x] Удалить GEMINI_API_KEY из env ✅

### Этап 5: Тестирование ✅
- [x] Тест базового чата ✅
- [x] Тест Tool Calling (getAccountBalance) ✅
- [x] Тест создания транзакций ✅ (исправлен execute-command route)
- [x] Тест RAG поиска ✅ (searchTransactions работает)

---

## 10. Тестовые запросы

1. **Базовый чат**: "Привет, как дела?"
2. **Баланс**: "Сколько у меня денег?"
3. **Расходы**: "Покажи расходы за месяц"
4. **Создание**: "Добавь расход 500 рублей на кафе"
5. **Аналитика**: "Проанализируй мои траты"
6. **RAG поиск**: "Найди все покупки в магазине"

---

## 11. Мониторинг и Cost Tracking

OpenRouter предоставляет:
- Dashboard с usage статистикой
- Cost per request в response headers
- Analytics API

```typescript
// Получение стоимости из response
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", ...);
const costHeader = response.headers.get("X-OpenRouter-Cost");
console.log(`Request cost: $${costHeader}`);
```

---

## 12. Fallback стратегия

OpenRouter поддерживает fallback на альтернативные модели:

```typescript
{
  models: [
    "google/gemini-2.5-flash-preview-05-20",
    "anthropic/claude-3-haiku",
    "openai/gpt-4o-mini"
  ],
  route: "fallback"
}
```

**НЕ ИСПОЛЬЗОВАТЬ** для этого проекта - модель должна быть жёстко зафиксирована.

---

## Итог

После интеграции режим "Финансы" будет:
- ✅ Работать через OpenRouter (без гео-блокировки)
- ✅ Использовать gemini-2.5-flash для чата
- ✅ Использовать text-embedding-3-large для RAG
- ✅ Поддерживать Tool Calling для всех финансовых операций
- ✅ Иметь streaming ответы
- ✅ Отслеживать costs через OpenRouter
