# 🔔 Webhooks: Мгновенные уведомления

**Получай события из Finappka в реальном времени!**

---

## 🎯 Что такое Webhooks?

**Простыми словами:**

Вместо того чтобы n8n каждые 5 минут спрашивал "Есть что-то новое?", Finappka **сам сразу сообщает** n8n когда что-то происходит.

### **Аналогия:**

**БЕЗ Webhooks (Polling):**
```
n8n: "Есть новые транзакции?" (каждые 5 минут)
Finappka: "Нет"
n8n: "Есть новые транзакции?"
Finappka: "Нет"
n8n: "Есть новые транзакции?"
Finappka: "Да, вот одна"
```
⚠️ Задержка до 5 минут

**С Webhooks:**
```
[Ты создаёшь транзакцию]
Finappka → СРАЗУ → n8n: "Новая транзакция!"
n8n → МГНОВЕННО → Telegram: "💸 Трата 500₽"
```
✅ Мгновенно (1-2 секунды)

---

## 📊 Как это работает?

### **Схема:**

```
1. ТЫ создаёшь транзакцию в Finappka
   ↓
2. Finappka СРАЗУ отправляет HTTP POST запрос в n8n
   ↓
3. n8n получает данные и обрабатывает
   ↓
4. n8n отправляет уведомление в Telegram
   ↓
5. ТЫ получаешь сообщение (через 1-2 секунды!)
```

---

## 🚀 Настройка (пошагово)

### **Шаг 1: Импортируй Webhook Workflow в n8n**

1. **Скачай файл:**
   ```
   /workflows/webhook-telegram-instant.json
   ```

2. **В n8n Cloud:**
   - Workflows → Import from File
   - Выбери `webhook-telegram-instant.json`

3. **Активируй workflow:**
   - Переключатель "Active" → ON

4. **Скопируй Webhook URL:**
   ```
   https://твой-workspace.app.n8n.cloud/webhook/finappka-webhook
   ```

### **Шаг 2: Создай секрет для подписи**

**Зачем?** Чтобы никто кроме Finappka не мог отправлять фейковые webhooks.

1. **Сгенерируй случайную строку:**
   ```bash
   # В PowerShell:
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
   
   # Или онлайн:
   https://www.random.org/strings/
   ```

2. **Сохрани секрет в n8n:**
   ```
   Settings → Environments
   Name: FINAPPKA_WEBHOOK_SECRET
   Value: твой-случайный-секрет-32-символа
   ```

### **Шаг 3: Зарегистрируй Webhook в Finappka**

**Через API:**

```bash
curl -X POST https://твой-домен.com/api/v1/webhooks \
  -H "Authorization: Bearer fpa_live_твой_ключ" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://твой-workspace.app.n8n.cloud/webhook/finappka-webhook",
    "events": ["transaction.created"],
    "secret": "твой-случайный-секрет-32-символа",
    "name": "n8n Telegram Notifications",
    "description": "Мгновенные уведомления в Telegram"
  }'
```

**Ответ:**
```json
{
  "webhook": {
    "id": "abc-123-def-456",
    "url": "https://...",
    "events": ["transaction.created"],
    "is_active": true,
    "created_at": "2024-10-23T21:00:00Z"
  }
}
```

**✅ Готово!** Теперь при каждой новой транзакции Finappka будет СРАЗУ уведомлять n8n!

---

## 🔐 Безопасность: HMAC подпись

### **Как Finappka подписывает webhook:**

```javascript
// 1. Берёт данные события
const payload = JSON.stringify({
  event: "transaction.created",
  data: { ... },
  user_id: "...",
  occurred_at: "2024-10-23T21:00:00Z"
});

// 2. Вычисляет HMAC SHA-256 подпись
const signature = crypto
  .createHmac('sha256', 'твой-секрет')
  .update(payload)
  .digest('hex');

// 3. Отправляет запрос с подписью
POST https://n8n.cloud/webhook/finappka-webhook
Headers:
  X-Webhook-Signature: abc123def456...
  X-Webhook-Event: transaction.created
  X-Webhook-Timestamp: 2024-10-23T21:00:00Z
Body:
  { event: "...", data: { ... } }
```

### **Как n8n проверяет подпись:**

```javascript
// 1. Получает payload и подпись
const payload = JSON.stringify($json);
const receivedSignature = $headers['x-webhook-signature'];
const secret = $env.FINAPPKA_WEBHOOK_SECRET;

// 2. Вычисляет ожидаемую подпись
const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

// 3. Сравнивает
if (receivedSignature !== expectedSignature) {
  throw new Error('Invalid signature! Фейковый webhook!');
}

// 4. Если совпало - обрабатывает
```

**Результат:** Только Finappka (знающий секрет) может отправлять валидные webhooks!

---

## 📡 Доступные события

### **Транзакции:**

| Событие | Когда срабатывает | Данные |
|---------|-------------------|--------|
| `transaction.created` | Создана новая транзакция | Полный объект транзакции |
| `transaction.updated` | Транзакция изменена | Обновлённый объект |
| `transaction.deleted` | Транзакция удалена | `{ id: "..." }` |

### **Бюджеты:**

| Событие | Когда срабатывает | Данные |
|---------|-------------------|--------|
| `budget.exceeded` | Превышен лимит бюджета | Объект бюджета + процент |
| `budget.warning` | Потрачено 80% бюджета | Объект бюджета + процент |

### **Цели:**

| Событие | Когда срабатывает | Данные |
|---------|-------------------|--------|
| `goal.achieved` | Достигнута цель накопления | Объект цели |
| `achievement.unlocked` | Разблокировано достижение | Объект достижения |

---

## 🎯 Примеры использования

### **Пример 1: Telegram уведомления**

**Workflow:**
```
Webhook → Validate → Format → Telegram
```

**Результат:**
```
💸 Новая транзакция!
💵 Сумма: 500₽
📁 Категория: Продукты
💳 Счёт: Основная карта
📝 Заметка: Магазин
📅 Дата: 23.10.2024 21:30

🔔 Мгновенное уведомление через Webhook
```

### **Пример 2: Slack уведомления**

**Workflow:**
```
Webhook → Validate → Slack Message
```

**Результат:**
```
:money_with_wings: New expense: $5.00
Category: Groceries
Account: Main Card
```

### **Пример 3: Google Sheets автодобавление**

**Workflow:**
```
Webhook → Validate → Add Row to Google Sheets
```

**Результат:** Каждая транзакция автоматически добавляется в таблицу.

### **Пример 4: Email при больших тратах**

**Workflow:**
```
Webhook → Validate → IF amount > 10000 → Send Email
```

**Результат:** Email только если трата больше 100₽.

---

## 🔧 Управление Webhooks

### **Получить список webhooks:**

```bash
GET /api/v1/webhooks
Authorization: Bearer fpa_live_твой_ключ
```

**Ответ:**
```json
{
  "webhooks": [
    {
      "id": "abc-123",
      "url": "https://...",
      "events": ["transaction.created"],
      "is_active": true,
      "total_calls": 42,
      "failed_calls": 0,
      "last_triggered_at": "2024-10-23T21:30:00Z"
    }
  ]
}
```

### **Получить один webhook:**

```bash
GET /api/v1/webhooks/{id}
Authorization: Bearer fpa_live_твой_ключ
```

### **Обновить webhook:**

```bash
PUT /api/v1/webhooks/{id}
Authorization: Bearer fpa_live_твой_ключ
Content-Type: application/json

{
  "is_active": false,
  "events": ["transaction.created", "transaction.updated"]
}
```

### **Удалить webhook:**

```bash
DELETE /api/v1/webhooks/{id}
Authorization: Bearer fpa_live_твой_ключ
```

---

## 📊 Мониторинг и отладка

### **Статистика webhook:**

Каждый webhook хранит:
- `total_calls` - всего вызовов
- `failed_calls` - неудачных вызовов
- `last_triggered_at` - последний вызов
- `last_success_at` - последний успешный
- `last_error_at` - последняя ошибка
- `last_error_message` - текст ошибки

### **Логи в n8n:**

1. **Executions** → Смотри все выполнения
2. **Фильтруй по workflow**
3. **Смотри детали каждого execution**

### **Тестирование webhook:**

```bash
# Отправь тестовый webhook вручную
curl -X POST https://твой-workspace.app.n8n.cloud/webhook/finappka-webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test" \
  -H "X-Webhook-Event: transaction.created" \
  -d '{
    "event": "transaction.created",
    "data": {
      "id": "test-123",
      "amount": 50000,
      "direction": "expense",
      "note": "Test transaction"
    },
    "user_id": "test-user",
    "occurred_at": "2024-10-23T21:00:00Z"
  }'
```

---

## ⚠️ Troubleshooting

### **Webhook не срабатывает:**

1. **Проверь что workflow активен:**
   - В n8n Cloud должен быть зелёный статус "Active"

2. **Проверь URL:**
   - Должен быть точно как в n8n
   - Без лишних слешей

3. **Проверь секрет:**
   - Должен совпадать в Finappka и n8n
   - Без пробелов

4. **Проверь события:**
   - `events` должен содержать нужное событие
   - Например: `["transaction.created"]`

### **Ошибка "Invalid signature":**

- Секрет не совпадает
- Проверь `FINAPPKA_WEBHOOK_SECRET` в n8n
- Проверь `secret` в webhook

### **Webhook получен, но Telegram не отправляется:**

- Проверь Telegram credentials в n8n
- Проверь `TELEGRAM_CHAT_ID`
- Посмотри логи execution в n8n

### **Задержка в доставке:**

- Webhooks должны быть мгновенными (1-2 сек)
- Если задержка - проверь логи Finappka
- Возможно проблема с сетью

---

## 🆚 Webhooks vs Polling

| Параметр | Webhooks | Polling (Schedule) |
|----------|----------|-------------------|
| **Скорость** | ⚡ Мгновенно (1-2 сек) | ⏰ До 5 минут |
| **Нагрузка** | ✅ Минимальная | ⚠️ Постоянные запросы |
| **Надёжность** | ⚠️ Зависит от сети | ✅ Гарантированно |
| **Настройка** | 🔧 Сложнее | ✅ Проще |
| **Безопасность** | 🔐 HMAC подпись | ✅ API ключ |
| **Для новичков** | ⚠️ Средне | ✅ Легко |

**Рекомендация:**
- **Для мгновенных уведомлений** → Webhooks
- **Для отчётов/аналитики** → Polling

---

## 💡 Best Practices

### **1. Всегда проверяй подпись:**

```javascript
// ✅ ПРАВИЛЬНО
const signature = $headers['x-webhook-signature'];
if (signature !== expectedSignature) {
  throw new Error('Invalid signature');
}

// ❌ НЕПРАВИЛЬНО
// Обрабатывать без проверки подписи
```

### **2. Используй retry механизм:**

Finappka автоматически делает 3 попытки с экспоненциальной задержкой:
- Попытка 1: сразу
- Попытка 2: через 2 сек
- Попытка 3: через 4 сек

### **3. Отвечай быстро:**

```javascript
// ✅ ПРАВИЛЬНО
Webhook → Validate → Respond (200 OK) → Process async

// ❌ НЕПРАВИЛЬНО
Webhook → Long processing → Respond (timeout!)
```

### **4. Логируй всё:**

- Все webhooks логируются в таблицу `webhook_logs`
- Можешь посмотреть историю в Finappka

### **5. Отключай неиспользуемые:**

```bash
# Если webhook не нужен - отключи
PUT /api/v1/webhooks/{id}
{ "is_active": false }
```

---

## 🎓 Итого

### **Что ты получаешь:**

✅ **Мгновенные уведомления** (1-2 секунды)  
✅ **Меньше нагрузки** на API  
✅ **Безопасность** через HMAC подпись  
✅ **Гибкость** - подписка на нужные события  
✅ **Надёжность** - автоматические retry  

### **Следующие шаги:**

1. Импортируй `webhook-telegram-instant.json`
2. Создай секрет
3. Зарегистрируй webhook в Finappka
4. Создай транзакцию
5. Получи мгновенное уведомление! 🎉

---

**Happy webhooking! 🚀**

*Документация обновлена: 23 октября 2024*
