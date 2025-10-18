# AI Tools System - Полное управление приложением через чат

## Обзор

AI ассистент теперь может ПОЛНОСТЬЮ управлять приложением через естественный язык. Система построена на базе Vercel AI SDK с функциями (tools).

## Архитектура

```
┌─────────────────┐
│   AI Chat UI    │ ← Пользователь вводит запрос
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  /api/ai/chat   │ ← Edge runtime, streamText + tools
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  /api/ai/tools  │ ← Node.js runtime, выполнение действий
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  tool-handlers  │ ← Server actions, работа с Supabase
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Supabase     │ ← База данных
└─────────────────┘
```

## Доступные инструменты

### 1. Управление картами

#### `addDebitCard`
Добавить дебетовую карту
```typescript
{
  name: "Тинькофф",
  bank: "Тинькофф",
  balance: 15000,
  currency: "RUB",
  cardNumber: "1234" // опционально
}
```

#### `addCreditCard`
Добавить кредитную карту
```typescript
{
  name: "Альфа Кредитка",
  bank: "Альфа-Банк",
  creditLimit: 100000,
  balance: 5000, // текущий долг
  currency: "RUB"
}
```

### 2. Транзакции

#### `addTransaction`
Создать доход или расход
```typescript
{
  amount: 500,
  categoryName: "Продукты",
  accountName: "Тинькофф",
  description: "Покупки в Пятёрочке",
  date: "2025-01-17", // опционально
  direction: "expense" // или "income"
}
```

### 3. Бюджеты

#### `addBudget`
Установить бюджет на категорию
```typescript
{
  categoryName: "Развлечения",
  amount: 10000,
  period: "monthly" // weekly, monthly, yearly
}
```

### 4. Планы (цели)

#### `addPlan`
Создать план накопления
```typescript
{
  name: "Отпуск в Турции",
  targetAmount: 100000,
  currentAmount: 0, // опционально
  deadline: "2025-07-01" // опционально
}
```

### 5. Категории

#### `addCategory`
Создать новую категорию
```typescript
{
  name: "Спорт",
  type: "expense", // income или expense
  icon: "fitness_center" // опционально
}
```

### 6. Закладки

#### `addBookmark`
Сохранить полезную ссылку
```typescript
{
  title: "Личный кабинет Тинькофф",
  url: "https://www.tinkoff.ru",
  category: "Финансы", // опционально
  description: "Банк" // опционально
}
```

### 7. Промпты

#### `addPrompt`
Сохранить шаблон для AI
```typescript
{
  title: "Анализ расходов",
  content: "Проанализируй мои расходы за месяц и дай советы",
  category: "Аналитика", // опционально
  tags: ["финансы", "анализ"] // опционально
}
```

### 8. Аналитика

#### `getFinancialSummary`
Финансовая сводка
```typescript
{
  period: "month" // week, month, year
}
```

#### `getExpensesByCategory`
Расходы по категориям
```typescript
{
  startDate: "2025-01-01", // опционально
  endDate: "2025-01-31" // опционально
}
```

#### `getAccountBalance`
Баланс счетов
```typescript
{
  accountName: "all" // или конкретное имя карты
}
```

## Примеры использования

### Добавление карты
```
👤 Пользователь: "Добавь мою карту Тинькофф с балансом 15000 рублей"

🤖 AI: "Отлично! Добавляю карту Тинькофф..."
      ✅ Карта "Тинькофф" успешно добавлена с балансом 15000 RUB
```

### Создание транзакции
```
👤 "Потратил 500 рублей на продукты в Пятёрочке"

🤖 "Записываю расход..."
   ✅ Транзакция расход 500 ₽ добавлена в категорию "Продукты"
```

### Установка бюджета
```
👤 "Поставь лимит 10000 рублей на развлечения в месяц"

🤖 "Создаю бюджет..."
   ✅ Бюджет 10000 ₽ на "Развлечения" создан (период: monthly)
```

### Аналитика
```
👤 "Покажи мой баланс за месяц"

🤖 "Анализирую финансы..."
   📊 За месяц: доходы 50000 ₽, расходы 35000 ₽, баланс +15000 ₽
```

## Технические детали

### Файлы системы

1. **`lib/ai/tools.ts`** - Схемы параметров (Zod)
2. **`lib/ai/tool-handlers.ts`** - Обработчики (Server Actions)
3. **`app/api/ai/tools/route.ts`** - API endpoint (Node.js)
4. **`app/api/ai/chat/route.ts`** - Chat endpoint (Edge)

### Безопасность

- ✅ RLS (Row Level Security) на всех таблицах
- ✅ Проверка `auth.uid()` в каждом handler
- ✅ Server Actions с `"use server"`
- ✅ Валидация параметров через Zod
- ✅ Edge runtime не имеет доступа к sensitive операциям

### Обработка ошибок

Все handlers возвращают структуру:
```typescript
{
  success: boolean,
  data?: any,
  message: string,
  error?: string
}
```

AI автоматически обрабатывает ошибки и сообщает пользователю.

## Расширение системы

### Добавить новый инструмент

1. **Добавить схему в `lib/ai/tools.ts`**:
```typescript
export const toolSchemas = {
  // ...
  myNewTool: z.object({
    param: z.string().describe("Описание"),
  }),
};
```

2. **Создать handler в `lib/ai/tool-handlers.ts`**:
```typescript
export async function handleMyNewTool(params: ToolParameters<"myNewTool">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();
  
  // Ваша логика
  
  return { success: true, message: "Готово!" };
}
```

3. **Добавить в маппинг**:
```typescript
export const toolHandlers = {
  // ...
  myNewTool: handleMyNewTool,
};
```

4. **Добавить в `app/api/ai/chat/route.ts`**:
```typescript
const tools = {
  // ...
  myNewTool: tool({
    description: "Что делает инструмент",
    parameters: toolSchemas.myNewTool,
    execute: async (params) => await callToolHandler('myNewTool', params),
  }),
};
```

## Тестирование

Примеры команд для теста:

```bash
# Карты
"Добавь карту Сбербанк с балансом 20000"
"Добавь кредитку Альфа с лимитом 50000"

# Транзакции  
"Расход 1500 на такси"
"Доход 50000 зарплата"

# Бюджеты
"Бюджет 5000 на кафе в месяц"

# Планы
"Накопить 500000 на машину до июля"

# Аналитика
"Баланс за неделю"
"Расходы по категориям"
"Сколько денег на всех счетах?"
```

## FAQ

**Q: Можно ли использовать другие языки модели?**  
A: Да, просто измените `getCommandsModel()` в `chat/route.ts`

**Q: Как добавить поддержку других валют?**  
A: Схемы уже поддерживают `currency`. Расширьте enum в `tools.ts`

**Q: Можно ли отключить конкретные tools?**  
A: Да, просто удалите их из объекта `tools` в `chat/route.ts`

**Q: Как логировать использование tools?**  
A: Добавьте логирование в `app/api/ai/tools/route.ts`

## Производительность

- Edge runtime для низкой латентности чата
- Node.js runtime для DB операций
- Параллельное выполнение независимых tools
- Кэширование на уровне Supabase

## Лимиты

- Max 30s на выполнение chat endpoint (Edge)
- Без лимита на tool handlers (Node.js)
- Зависит от лимитов OpenRouter API
