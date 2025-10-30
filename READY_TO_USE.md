# ✅ ВСЁ ГОТОВО! Финальная настройка n8n

## 🎉 Что уже сделано

1. ✅ **Telegram Bot Credential создан** - "FNS Bot"
2. ✅ **OpenAI Credential есть** - "n8n free OpenAI API credits"
3. ✅ **API endpoint готов** - `/api/receipts/import`
4. ✅ **Webhook URL готов** - `https://domik1.app.n8n.cloud/webhook/cf135bc5-aedb-4d05-8743-67db3a0f3304`

## 📝 Ваши данные

```
Telegram Bot Token: 8090380353:AAGeiIH0tA_kXoJ8HeMN3RTmR8O4hgXojzE
Telegram Bot Name: Finappka_FNS_Bot
OpenRouter API Key: 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
n8n Workspace: https://domik1.app.n8n.cloud
```

---

## 🚀 Быстрая настройка (5 минут)

### Шаг 1: Импортируй готовый workflow

1. **Скачай файл:**
   ```
   c:\fin3\finapp\integrations\n8n-cloud\workflows\telegram-fns-to-finappka.json
   ```

2. **Открой n8n:**
   ```
   https://domik1.app.n8n.cloud/home/workflows
   ```

3. **Импортируй:**
   - Кнопка с 3 точками (⋮) → **Import from File**
   - Выбери `telegram-fns-to-finappka.json`

### Шаг 2: Настрой credentials в workflow

После импорта откроется workflow. Нужно применить credentials к каждому node:

#### A. Telegram Bot Trigger
1. Кликни на node "Telegram Bot"
2. **Credential** → Выбери **"FNS Bot"**
3. Готово!

#### B. AI Categorize (OpenAI)
1. Кликни на node "AI Categorize"
2. **Credential** → Выбери **"n8n free OpenAI API credits"**
3. Готово!

**ИЛИ используй OpenRouter:**

Если хочешь использовать OpenRouter вместо OpenAI:
1. Удали node "AI Categorize" (OpenAI)
2. Добавь node **"HTTP Request"**
3. Настрой:
   ```
   Method: POST
   URL: https://openrouter.ai/api/v1/chat/completions
   
   Headers:
   Authorization: Bearer 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
   Content-Type: application/json
   
   Body (JSON):
   {
     "model": "openai/gpt-4o-mini",
     "messages": [
       {
         "role": "system",
         "content": "Ты - эксперт по категоризации покупок..."
       },
       {
         "role": "user",
         "content": "{{ $json.raw_text }}"
       }
     ]
   }
   ```

#### C. Send Success & Send Error (Telegram)
1. Кликни на node "Send Success"
2. **Credential** → Выбери **"FNS Bot"**
3. Повтори для node "Send Error"

#### D. Import to Finappka (HTTP Request)
1. Кликни на node "Import to Finappka"
2. Измени **URL**:
   
   **Если локально (с ngrok):**
   ```bash
   # Запусти ngrok
   ngrok http 3000
   
   # Скопируй URL: https://abc123.ngrok.io
   ```
   
   Вставь: `https://abc123.ngrok.io/api/receipts/import`
   
   **Если задеплоил:**
   ```
   https://твой-домен.vercel.app/api/receipts/import
   ```

3. **Authentication** → None (пока)
   
   *Позже добавим Supabase auth header*

### Шаг 3: Сохрани и активируй

1. Нажми **"Save"** (Ctrl+S)
2. Переключатель **"Active"** → ON
3. Готово! 🎉

---

## 🧪 Тестирование

### 1. Получи чек от ФНС бота

Сделай покупку и получи чек от @ofd_receipt_bot

### 2. Перешли чек своему боту

1. Открой Telegram
2. Найди своего бота: **@Finappka_FNS_Bot**
3. Перешли сообщение от ФНС бота
4. Жди 3-5 секунд

### 3. Получи подтверждение

Бот ответит:
```
✅ Чек обработан!

🏪 Магазин: Пятёрочка
💰 Сумма: 337.96₽
📁 Категория: Продукты

📦 Товары:
• Молоко - 47.99₽ (Продукты)
• Хлеб - 89.99₽ (Продукты)

✨ Транзакции созданы в Finappka!
```

### 4. Проверь Finappka

Открой **Транзакции** — должны появиться новые записи!

---

## 🔧 Если что-то не работает

### Проблема: Бот не отвечает

**Решение:**
1. Проверь что workflow **Active** (зелёный переключатель)
2. Проверь Executions в n8n:
   ```
   https://domik1.app.n8n.cloud/home/executions
   ```
3. Посмотри ошибки

### Проблема: Транзакции не создаются

**Решение:**
1. Проверь что Finappka доступен из интернета (ngrok или деплой)
2. Проверь URL в node "Import to Finappka"
3. Посмотри логи в n8n Executions

### Проблема: AI неправильно категоризирует

**Решение:**
1. Используй OpenRouter вместо бесплатного OpenAI
2. Улучши промпт в node "AI Categorize"
3. Добавь примеры в промпт

---

## 📊 Альтернатива: Упрощённый workflow (без AI)

Если не хочешь настраивать AI, можешь использовать простую версию:

### Создай новый workflow вручную:

1. **Telegram Trigger**
   - Credential: FNS Bot
   - Updates: Message

2. **Code** (Parse Receipt)
   - Парсит чек (код в `FNS_TELEGRAM_AUTOMATION.md`)

3. **HTTP Request** (Create Transaction)
   - URL: `https://твой-url/api/receipts/import`
   - Method: POST
   - Body: данные чека

4. **Telegram** (Send Success)
   - Credential: FNS Bot
   - Text: "✅ Чек обработан!"

**Активируй** → Готово!

---

## 💡 Следующие шаги

После того как базовая автоматизация заработает:

1. **Добавь AI категоризацию** (OpenRouter)
2. **Настрой автосоздание категорий**
3. **Добавь фильтры** (игнорировать определённые магазины)
4. **Настрой уведомления** о превышении бюджета
5. **Создай ежедневные отчёты**

---

## 📚 Документация

- **Полная инструкция:** `FNS_TELEGRAM_AUTOMATION.md`
- **API endpoint:** `app/api/receipts/import/route.ts`
- **Готовый workflow:** `integrations/n8n-cloud/workflows/telegram-fns-to-finappka.json`

---

## ✅ Чеклист

- [ ] Импортировал workflow в n8n
- [ ] Применил credential "FNS Bot" к Telegram nodes
- [ ] Применил credential к AI node (или настроил OpenRouter)
- [ ] Изменил URL в "Import to Finappka" node
- [ ] Сохранил workflow
- [ ] Активировал workflow
- [ ] Протестировал с реальным чеком
- [ ] Проверил транзакции в Finappka

---

**🎉 Готово! Теперь чеки импортируются автоматически! 🤖**

**Нужна помощь?** Пиши, помогу разобраться!
