# AI Embeddings и семантический поиск

## 📚 Что это такое?

**Embeddings** — это векторное представление текста, которое позволяет компьютеру понимать **смысл** слов и фраз, а не просто сравнивать буквы.

**Семантический поиск** — это поиск по смыслу, а не по точному совпадению слов.

## 🎯 Зачем это нужно?

### Обычный поиск

```text
Ищете: "супермаркет"
Найдёт: только записи со словом "супермаркет"
```

### Семантический поиск

```text
Ищете: "супермаркет"
Найдёт: Пятёрочка, Перекрёсток, магазин продуктов, гастроном и т.д.
```

## 🚀 Функции

### 1. Автоматическая категоризация транзакций

AI анализирует описание транзакции и предлагает подходящую категорию:

```typescript
POST /api/ai/categorize
{
  "description": "Такси Яндекс до аэропорта",
  "direction": "expense"
}

// Ответ:
{
  "suggestion": {
    "categoryId": "uuid",
    "categoryName": "Транспорт",
    "confidence": 95,
    "explanation": "Услуга такси относится к транспортным расходам"
  }
}
```

### 2. Семантический поиск транзакций

Ищите транзакции по смыслу:

```typescript
POST /api/ai/semantic-search
{
  "query": "кофе",
  "limit": 10,
  "threshold": 0.7
}

// Найдёт: Starbucks, кофейня, Coffee House, капучино и т.д.
```

### 3. Автоматическое создание embeddings

При каждой новой транзакции автоматически создаётся embedding для семантического поиска.

## 🛠️ Настройка

### 1. Добавьте OpenAI API ключ

В `.env.local`:

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Примените миграцию

Выполните SQL из `db/migrations/20251011_semantic_search_function.sql` в Supabase SQL Editor.

Эта миграция создаёт:

- Функцию `search_transactions_by_embedding()` для поиска
- Функцию `suggest_category_from_similar()` для предложения категорий
- Индекс `idx_transactions_embedding` для быстрого поиска

### 3. Установите зависимости

```bash
npm install
```

### 4. Сгенерируйте embeddings для существующих транзакций

```bash
POST /api/ai/generate-embeddings
Authorization: Bearer {{ env.CRON_SECRET }}
```

Или настройте CRON задачу в Vercel:

```json
vercel.json:
{
  "crons": [{
    "path": "/api/ai/generate-embeddings",
    "schedule": "0 2 * * *"  // Каждый день в 2:00
{{ ... }}
  }]
}
```

## 📖 Использование в коде

### Создать embedding для текста

```typescript
import { createEmbedding } from "@/lib/ai/embeddings";

const embedding = await createEmbedding("Покупка продуктов в Пятёрочке");
// Вернёт массив из 1536 чисел
```

### Поиск похожих транзакций

```typescript
import { searchSimilarTransactions } from "@/lib/ai/search";

const embedding = await createEmbedding("кафе");
const results = await searchSimilarTransactions(embedding, 10, 0.7);

// results содержит транзакции с similarity >= 0.7
results.forEach(tx => {
  console.log(`${tx.description} (${tx.similarity * 100}% похожесть)`);
});
```

### Найти похожие транзакции по ID

```typescript
import { findSimilarToTransaction } from "@/lib/ai/search";

const similar = await findSimilarToTransaction(transactionId, 5);
// Вернёт 5 самых похожих транзакций
```

### Предложить категорию

```typescript
import { suggestCategory } from "@/lib/ai/embeddings";

const categories = [
  { id: "1", name: "Еда", type: "expense" },
  { id: "2", name: "Транспорт", type: "expense" },
  // ...
];

const suggestion = await suggestCategory(
  "Заправка бензином на АЗС Лукойл",
  categories
);

console.log(suggestion.categoryName); // "Транспорт"
console.log(suggestion.confidence);    // 0.95
console.log(suggestion.explanation);   // "Заправка топлива - транспортный расход"
```

## 💰 Стоимость

Модель `text-embedding-3-small`:

- **$0.02 за 1 млн токенов**
- Средняя транзакция: ~50 токенов
- **20,000 транзакций ≈ $0.02** (2 цента!)

Модель `gpt-4o-mini` (для категоризации):

- **$0.15 за 1 млн входных токенов**
- **$0.60 за 1 млн выходных токенов**
- Одна категоризация: ~100 токенов
- **1000 категоризаций ≈ $0.075** (7.5 центов)

## 🔒 Безопасность

- ✅ API ключ OpenAI только на сервере (никогда в клиенте!)
- ✅ Все запросы через Server Actions или API routes
- ✅ RLS политики Supabase защищают данные пользователей
- ✅ Embeddings создаются асинхронно, не блокируют UI

## 📊 Производительность

### Индекс IVFFlat

Используется индекс `ivfflat` для ускорения поиска по векторам:

```sql
CREATE INDEX idx_transactions_embedding ON transactions 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

- `lists = 100` подходит для ~10,000 транзакций
- Для больших объёмов: `lists = sqrt(n_rows)`
- Поиск работает за миллисекунды даже на больших объёмах

### Оптимизация

1. **Батчинг**: создавайте embeddings батчами через `createEmbeddings()`
2. **Кэширование**: повторные запросы можно кэшировать
3. **Lazy loading**: embeddings создаются в фоне, не блокируют создание транзакции

## 🐛 Отладка

### Проверить embeddings в БД

```sql
SELECT 
  id, 
  description, 
  embedding IS NOT NULL as has_embedding
FROM transactions
WHERE user_id = 'your-user-id'
LIMIT 10;
```

### Тестовый поиск

```sql
-- Найти транзакции похожие на вектор (пример)
SELECT * FROM search_transactions_by_embedding(
  '[0.1, 0.2, ...]'::vector,  -- ваш embedding вектор
  0.3,                          -- threshold
  10,                           -- limit
  'your-user-id'::uuid
);
```

### Логи

Ошибки embeddings логируются в консоль, но не ломают основной функционал:

```typescript
console.error("Error creating embedding:", err);
// Транзакция всё равно создастся!
```

## 📝 Примеры использования

### В формах транзакций

```typescript
// При вводе описания показать предложение AI
const [aiSuggestion, setAiSuggestion] = useState(null);

async function handleDescriptionChange(description: string) {
  if (description.length > 5) {
    const response = await fetch("/api/ai/categorize", {
      method: "POST",
      body: JSON.stringify({ description, direction: "expense" }),
    });
    const data = await response.json();
    setAiSuggestion(data.suggestion);
  }
}

// Показать пользователю:
{aiSuggestion && (
  <div className="ai-suggestion">
    💡 AI предлагает категорию: {aiSuggestion.categoryName}
    ({aiSuggestion.confidence}% уверенность)
    <button onClick={() => selectCategory(aiSuggestion.categoryId)}>
      Применить
    </button>
  </div>
)}
```

### Умная строка поиска

```typescript
async function semanticSearch(query: string) {
  const response = await fetch("/api/ai/semantic-search", {
    method: "POST",
    body: JSON.stringify({ query, limit: 20 }),
  });
  const data = await response.json();
  return data.results;
}

// Пользователь ищет "кофе" → находит все кафе и кофейни
const results = await semanticSearch("кофе");
```

## 🎓 Полезные ссылки

- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase Vector Search](https://supabase.com/docs/guides/ai/vector-columns)

## ✅ Что дальше?

- [ ] Добавить UI для семантического поиска в интерфейс транзакций
- [ ] Настроить CRON для автоматической генерации embeddings
- [ ] Добавить кэширование предложений категорий
- [ ] Реализовать "умные теги" на основе похожих транзакций
- [ ] Месячные AI инсайты: "Вы часто тратите на кофе и рестораны"
