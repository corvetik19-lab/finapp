# 🚀 Finappka + n8n Cloud Integration

**Автоматизация финансов через облачный сервис n8n без установки!**

---

## 📋 Содержание

1. [Введение](#введение)
2. [Быстрый старт](#быстрый-старт)
3. [Настройка](#настройка)
4. [Готовые Workflows](#готовые-workflows)
5. [Webhooks - Мгновенные уведомления](#webhooks)
6. [API Endpoints](#api-endpoints)
7. [Примеры](#примеры)
8. [Troubleshooting](#troubleshooting)

---

## Введение

**n8n Cloud** - это облачный сервис автоматизации, который работает 24/7 без установки.

### Что можно делать:

- ✅ Автоматически получать уведомления о транзакциях в Telegram/Slack/Email
- ✅ Синхронизировать данные с Google Sheets, Airtable, Notion
- ✅ Создавать автоматические отчёты и дашборды
- ✅ Интегрировать с 400+ сервисами (Zapier альтернатива)

### Преимущества:

- 🌐 Работает онлайн - не нужен свой сервер
- 🔄 Webhooks из коробки - есть публичный URL
- 🎨 Визуальный редактор - drag & drop
- 📦 Готовые templates - импорт одной кнопкой

---

## Быстрый старт

### Шаг 1: Регистрация в n8n Cloud

1. **Открой:** https://n8n.io/cloud
2. **Нажми:** "Start for free"
3. **Зарегистрируйся:**
   - Email
   - Пароль
   - Подтверди email

**🎁 Бесплатный тариф:**
- 20,000 выполнений/месяц
- Неограниченные workflows
- Все features

### Шаг 2: Получить API ключ из Finappka

1. **Открой Finappka:** http://localhost:3000 (или твой домен)
2. **Войди** в свой аккаунт
3. **Перейди:** Settings → Developer → API Keys
4. **Создай ключ:**
   ```
   Name: n8n Cloud Integration
   Scopes: ☑️ read, ☑️ write
   ```
5. **СОХРАНИ КЛЮЧ!** Например: `fpa_live_abc123...`

### Шаг 3: Настроить Credentials в n8n Cloud

1. **Открой n8n Cloud:** твой URL типа `https://yourname.app.n8n.cloud`
2. **Перейди:** Settings (⚙️) → Credentials
3. **Нажми:** "+ New Credential"
4. **Выбери:** "HTTP Header Auth"
5. **Заполни:**
   ```
   Credential Name: Finappka API
   Name: Authorization
   Value: Bearer fpa_live_abc123... (твой ключ)
   ```
6. **Сохрани** ✅

### Шаг 4: Импортировать готовый Workflow

1. **Скачай:** один из готовых workflows (см. `/workflows/`)
2. **В n8n Cloud:** Workflows → Import from File
3. **Выбери** скачанный JSON
4. **Настрой:**
   - В **HTTP Request nodes** выбери credential "Finappka API"
   - В **Base URL** укажи: `http://localhost:3000` (или твой домен)
5. **Активируй** workflow (кнопка Active)

🎉 **Готово!** Автоматизация работает!

---

## Настройка

### Finappka API Base URL

**Локальная разработка:**
```
http://localhost:3000
```

**Production (когда задеплоишь):**
```
https://твой-домен.com
```

⚠️ **Важно:** Для webhooks Finappka должен быть доступен из интернета!

### Публичный доступ для webhooks

Если Finappka на локалхосте, используй:

**Вариант 1: ngrok (самый простой)**
```bash
# Установить ngrok
choco install ngrok

# Запустить туннель
ngrok http 3000

# Получишь URL типа: https://abc123.ngrok.io
# Используй его как Base URL в n8n
```

**Вариант 2: локалтуннель**
```bash
npm install -g localtunnel
lt --port 3000
```

**Вариант 3: Деплой в продакшен**
- Vercel
- Railway
- Fly.io

---

## Готовые Workflows

### 📁 Список готовых templates:

| Workflow | Описание | Тип | Файл |
|----------|----------|-----|------|
| ⚡ **Webhook → Telegram** | Мгновенные уведомления (1-2 сек) | Webhook | `webhook-telegram-instant.json` |
| 🤖 **ФНС Telegram → AI → Finappka** | Автоимпорт чеков с AI категоризацией | Telegram Bot | `telegram-fns-to-finappka.json` |
| 🔔 **Schedule → Telegram** | Уведомления каждые 5 минут | Schedule | `telegram-notifications.json` |
| 📥 **Get Transactions** | Получение списка транзакций | Manual | `get-transactions.json` |
| 📤 **Create Transaction** | Создание новой транзакции | Manual | `create-transaction.json` |

### Как использовать:

1. Открой файл из `/workflows/`
2. Скопируй содержимое
3. В n8n Cloud: Workflows → "+" → Import from JSON
4. Вставь JSON
5. Настрой credentials
6. Активируй

---

## Webhooks

### 🔔 Мгновенные уведомления в реальном времени!

**Вместо проверки каждые 5 минут, Finappka СРАЗУ уведомляет n8n о событиях!**

**Преимущества:**
- ⚡ **Мгновенно** - уведомления за 1-2 секунды
- 🎯 **Точно** - только нужные события
- 🔐 **Безопасно** - HMAC подпись
- 💪 **Надёжно** - автоматические retry

**📖 Полная документация:** [WEBHOOKS.md](./WEBHOOKS.md)

**Быстрый старт:**

1. Импортируй `webhook-telegram-instant.json` в n8n
2. Скопируй Webhook URL из n8n
3. Создай секрет для подписи
4. Зарегистрируй webhook в Finappka:

```bash
curl -X POST https://твой-домен.com/api/v1/webhooks \
  -H "Authorization: Bearer fpa_live_твой_ключ" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://твой-workspace.app.n8n.cloud/webhook/finappka-webhook",
    "events": ["transaction.created"],
    "secret": "твой-секрет",
    "name": "n8n Notifications"
  }'
```

**Готово!** Теперь при каждой транзакции ты получишь мгновенное уведомление! 🎉

---

## API Endpoints

### Base URL
```
https://твой-домен.com/api/v1
```

### Authentication
```http
Authorization: Bearer fpa_live_your_api_key
```

### Endpoints

#### 1. Транзакции

**Получить все транзакции:**
```http
GET /transactions?limit=10&from=2024-01-01&to=2024-12-31
```

**Получить одну транзакцию:**
```http
GET /transactions/{id}
```

**Создать транзакцию:**
```http
POST /transactions
Content-Type: application/json

{
  "amount": 50000,
  "direction": "expense",
  "account_id": "uuid",
  "category_id": "uuid",
  "occurred_at": "2024-10-23T10:00:00Z",
  "note": "Покупка продуктов"
}
```

**Обновить транзакцию:**
```http
PUT /transactions/{id}
Content-Type: application/json

{
  "amount": 55000,
  "note": "Обновлённая заметка"
}
```

**Удалить транзакцию:**
```http
DELETE /transactions/{id}
```

#### 2. Счета (Accounts)

**Получить все счета:**
```http
GET /accounts
```

**Создать счёт:**
```http
POST /accounts
Content-Type: application/json

{
  "name": "Основная карта",
  "type": "card",
  "currency": "RUB",
  "balance": 10000000
}
```

#### 3. Категории

**Получить все категории:**
```http
GET /categories
```

**Создать категорию:**
```http
POST /categories
Content-Type: application/json

{
  "name": "Продукты",
  "type": "expense",
  "icon": "🛒"
}
```

#### 4. Бюджеты

**Получить все бюджеты:**
```http
GET /budgets
```

**Создать бюджет:**
```http
POST /budgets
Content-Type: application/json

{
  "name": "Месячный бюджет на еду",
  "category_id": "uuid",
  "amount": 3000000,
  "period": "month"
}
```

---

## Примеры

### Пример 1: HTTP Request в n8n

**Node: HTTP Request**

```
Method: GET
URL: https://твой-домен.com/api/v1/transactions
Authentication: Predefined Credential Type
  → HTTP Header Auth
  → Finappka API (выбери свой credential)
Options:
  Query Parameters:
    - limit: 10
    - from: 2024-10-01
    - to: 2024-10-31
```

**Результат:**
```json
{
  "transactions": [
    {
      "id": "123",
      "amount": 50000,
      "direction": "expense",
      "category": {
        "name": "Продукты"
      },
      "note": "Магазин"
    }
  ]
}
```

### Пример 2: Создание транзакции

**Node: HTTP Request**

```
Method: POST
URL: https://твой-домен.com/api/v1/transactions
Authentication: HTTP Header Auth → Finappka API
Body:
  Content Type: JSON
  {
    "amount": {{ $json.amount * 100 }},
    "direction": "expense",
    "account_id": "{{ $json.account_id }}",
    "category_id": "{{ $json.category_id }}",
    "note": "{{ $json.note }}"
  }
```

### Пример 3: Webhook для новых транзакций

**⚠️ Важно:** Webhooks пока НЕ реализованы в Finappka!

Альтернатива - использовать **Schedule Trigger**:

```
Schedule Trigger (каждые 5 минут)
  → HTTP Request (GET /transactions?limit=5)
  → Filter (только новые за последние 5 мин)
  → Telegram/Email/Slack
```

---

## Troubleshooting

### ❌ "Request failed with status code 401"

**Причина:** Неверный API ключ

**Решение:**
1. Проверь API ключ в Finappka
2. Создай новый ключ
3. Обнови credentials в n8n Cloud

### ❌ "ECONNREFUSED"

**Причина:** Finappka недоступен

**Решение:**
1. Убедись что Finappka запущен: `npm run dev`
2. Проверь URL в n8n
3. Если локально - используй ngrok

### ❌ "Amount must be an integer"

**Причина:** Сумма должна быть в копейках (целое число)

**Решение:**
```javascript
// Вместо:
"amount": 500.00

// Используй:
"amount": 50000  // (500₽ × 100)
```

### ❌ "Account not found"

**Причина:** Неверный account_id

**Решение:**
1. Получи список счетов: `GET /accounts`
2. Используй правильный UUID

---

## 🎓 Дополнительно

### Полезные ссылки:

- **n8n Cloud:** https://n8n.io/cloud
- **n8n Documentation:** https://docs.n8n.io
- **n8n Community:** https://community.n8n.io
- **Finappka API Docs:** http://localhost:3000/api/docs

### Видео туториалы:

- n8n Cloud Setup: https://www.youtube.com/watch?v=...
- HTTP Request Node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/

---

## 💡 Советы

1. **Всегда тестируй** workflows кнопкой "Execute Node" перед активацией
2. **Используй Filter nodes** чтобы избежать дублей
3. **Храни credentials в безопасности** - не делись ими
4. **Логируй ошибки** через Error Trigger node
5. **Для production** деплой Finappka на сервер с HTTPS

---

## ✅ Готово!

Теперь можно создавать любые автоматизации с Finappka через n8n Cloud! 🎉

**Следующие шаги:**
1. Зарегистрируйся в n8n Cloud
2. Создай API ключ в Finappka
3. Импортируй готовый workflow
4. Настрой и активируй

**Нужна помощь?** Открой issue на GitHub!
