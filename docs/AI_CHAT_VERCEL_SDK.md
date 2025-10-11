# 🤖 AI Чат с Vercel AI SDK

## ✨ Что нового?

Мы полностью переписали AI чат используя **Vercel AI SDK** - профессиональный фреймворк для создания AI-приложений.

### Преимущества новой версии:

| Старая версия | Новая версия (Vercel AI SDK) |
|---------------|------------------------------|
| ❌ Простой POST запрос | ✅ Streaming ответов в реальном времени |
| ❌ Ждать полного ответа | ✅ Текст появляется по мере генерации |
| ❌ Нет истории контекста | ✅ Полная история сообщений |
| ❌ Нет stop/regenerate | ✅ Остановка и управление |
| ❌ Базовый UI | ✅ Современный профессиональный UI |
| ❌ Нет контекста данных | ✅ Автоматический контекст из БД |

---

## 🏗️ Архитектура

### Backend (API Route)

**Файл:** `app/api/chat/route.ts`

```typescript
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  // Автоматически загружает контекст из Supabase
  const context = await loadUserFinancialContext();
  
  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: "Ты финансовый помощник..." + context,
    messages: convertToModelMessages(messages),
  });
  
  return result.toUIMessageStreamResponse(); // Streaming!
}
```

**Фичи:**
- ✅ **Streaming** - ответ идёт по частям
- ✅ **Контекст** - автоматически загружает последние транзакции, счета, бюджеты
- ✅ **Безопасность** - проверка авторизации через Supabase Auth

### Frontend (React Component)

**Файл:** `app/(protected)/ai-chat/Chat.tsx`

```typescript
import { useChat } from "@ai-sdk/react";

const { messages, sendMessage, status, stop } = useChat({
  transport: new DefaultChatTransport({ api: "/api/chat" }),
});
```

**Фичи:**
- ✅ **useChat hook** - управление состоянием
- ✅ **Streaming UI** - текст появляется плавно
- ✅ **Status** - submitted → streaming → ready
- ✅ **Stop** - остановка генерации
- ✅ **Auto-scroll** - автоматическая прокрутка

---

## 📊 Контекст для AI

Чат автоматически передаёт AI актуальные данные пользователя:

### 1. Счета
```
### Счета:
- Основной: 25000.00 RUB
- Сбережения: 150000.00 RUB
```

### 2. Последние транзакции
```
### Последние транзакции:
- 11.10.2025: -1500.00 руб. - Пятёрочка
- 10.10.2025: +50000.00 руб. - Зарплата
```

### 3. Бюджеты
```
### Бюджеты:
- Продукты: 12000.00 / 15000.00 руб. (80%)
- Транспорт: 3000.00 / 5000.00 руб. (60%)
```

Это позволяет AI давать **точные и персонализированные ответы**!

---

## 💬 Примеры использования

### Пользователь:
> Какой у меня баланс?

### AI:
> 💰 Ваш текущий баланс:
> 
> - **Основной счёт**: 25,000 ₽
> - **Сбережения**: 150,000 ₽
> 
> **Итого**: 175,000 ₽ 📊

---

### Пользователь:
> На что я больше трачу?

### AI:
> 📊 Ваш топ категорий по расходам в этом месяце:
> 
> 1. **Продукты** - 12,000 ₽ (40%)
> 2. **Транспорт** - 3,000 ₽ (10%)
> 3. **Развлечения** - 2,500 ₽ (8%)
> 
> 💡 Совет: Бюджет на продукты составляет 80% от лимита. Рассмотрите возможность оптимизации покупок.

---

## 🎨 UI Features

### Welcome Screen
- Приветственное сообщение
- Быстрые вопросы (Quick Questions)
- Примеры использования

### Chat Messages
- **User messages**: градиент (фиолетовый)
- **AI messages**: белый фон
- **Avatars**: 👤 / 🤖
- **Typing indicator**: анимированные точки

### Input Form
- Auto-focus
- Disable при загрузке
- Send button с иконкой
- Stop button при streaming

### Responsive Design
- Mobile-friendly
- Adaptive message width
- Touch-friendly buttons

---

## ⚙️ Конфигурация

### OpenAI Model
```typescript
model: openai("gpt-4o-mini")
```

Можно заменить на:
- `gpt-4o` - более умная модель
- `gpt-3.5-turbo` - быстрее и дешевле

### Temperature & Tokens
```typescript
temperature: 0.7,  // Креативность (0-2)
maxTokens: 1000,   // Макс длина ответа
```

### System Prompt
Системный промпт определяет роль и поведение AI. Можно кастомизировать под свои нужды!

---

## 🚀 Деплой

### Vercel Environment Variables

Убедитесь что в Vercel настроена переменная:
```
OPENAI_API_KEY=sk-...
```

### Build
```bash
npm run build
```

### Deploy
```bash
git push origin main
```

Vercel автоматически задеплоит!

---

## 🔒 Безопасность

### Authentication
- ✅ Проверка `auth.getUser()` в API route
- ✅ Доступ только к своим данным (RLS)
- ✅ Нет утечки данных других пользователей

### API Key
- ✅ Ключ только на сервере
- ✅ Никогда не передаётся клиенту
- ✅ Хранится в environment variables

---

## 📚 Дополнительные ресурсы

- [Vercel AI SDK Docs](https://ai-sdk.dev)
- [useChat API Reference](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)
- [Streaming Guide](https://ai-sdk.dev/docs/ai-sdk-core/streaming)
- [OpenAI Models](https://platform.openai.com/docs/models)

---

## ✅ Готово!

Теперь у вас современный AI чат с:
- Streaming ответами
- Контекстом финансовых данных
- Профессиональным UI
- Полной интеграцией с Vercel AI SDK

**Попробуйте сейчас:** https://finappka.vercel.app/ai-chat 🚀
