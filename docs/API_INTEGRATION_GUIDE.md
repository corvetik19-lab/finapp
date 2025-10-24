# 🚀 API Integration Guide - Finappka

Полное руководство по интеграции с Finappka через REST API, Webhooks и n8n.

## 📋 Содержание

1. [Быстрый старт](#быстрый-старт)
2. [REST API](#rest-api)
3. [Webhooks](#webhooks)
4. [n8n Integration](#n8n-integration)
5. [Примеры использования](#примеры-использования)
6. [Безопасность](#безопасность)
7. [Rate Limiting](#rate-limiting)

---

## Быстрый старт

### 1. Получите API ключ

```
1. Войдите в Finappka
2. Перейдите в Settings → API Keys
3. Нажмите "Создать ключ"
4. Скопируйте ключ (показывается только один раз!)
```

### 2. Сделайте первый запрос

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://finappka.com/api/v1/transactions?limit=10
```

### 3. Документация

Интерактивная документация: https://finappka.com/api/docs

---

## REST API

### Базовый URL

```
Production: https://finappka.com/api/v1
Development: http://localhost:3000/api/v1
```

### Аутентификация

Все запросы требуют API ключ в заголовке:

```
Authorization: Bearer YOUR_API_KEY
```

### Endpoints

#### **Transactions** `/api/v1/transactions`

**GET** - Получить список транзакций
```bash
curl -H "Authorization: Bearer KEY" \
  "https://finappka.com/api/v1/transactions?limit=50&from=2025-10-01&direction=expense"
```

Query параметры:
- `limit` (1-100, default: 50)
- `offset` (default: 0)
- `from` (YYYY-MM-DD)
- `to` (YYYY-MM-DD)
- `direction` (income|expense|transfer)
- `account_id` (UUID)
- `category_id` (UUID)

**POST** - Создать транзакцию
```bash
curl -X POST \
  -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150000,
    "direction": "expense",
    "account_id": "uuid",
    "category_id": "uuid",
    "occurred_at": "2025-10-22T10:00:00Z",
    "note": "Покупка продуктов"
  }' \
  https://finappka.com/api/v1/transactions
```

#### **Accounts** `/api/v1/accounts`

**GET** - Получить счета
```bash
curl -H "Authorization: Bearer KEY" \
  "https://finappka.com/api/v1/accounts?include_balance=true"
```

**POST** - Создать счёт
```bash
curl -X POST \
  -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Наличные",
    "type": "cash",
    "currency": "RUB",
    "initial_balance": 0
  }' \
  https://finappka.com/api/v1/accounts
```

#### **Budgets** `/api/v1/budgets`

**GET** - Получить бюджеты
```bash
curl -H "Authorization: Bearer KEY" \
  "https://finappka.com/api/v1/budgets?include_spent=true&active=true"
```

#### **Categories** `/api/v1/categories`

**GET** - Получить категории
```bash
curl -H "Authorization: Bearer KEY" \
  "https://finappka.com/api/v1/categories?type=expense"
```

### Response Format

Успешный ответ (200-201):
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

Ошибка (4xx, 5xx):
```json
{
  "error": "Error type",
  "message": "Human readable message",
  "details": "Additional info"
}
```

### Rate Limiting

Headers в каждом ответе:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-Response-Time: 45ms
```

При превышении лимита (429):
```
Retry-After: 60
```

---

## Webhooks

### Что такое Webhooks?

Webhooks позволяют получать HTTP уведомления при событиях в реальном времени.

### Регистрация Webhook

```bash
curl -X POST \
  -H "Authorization: Bearer SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Мой сервер",
    "url": "https://myserver.com/webhook",
    "events": ["transaction.created", "budget.exceeded"],
    "retry_count": 3,
    "timeout_seconds": 10
  }' \
  https://finappka.com/api/webhooks
```

Response:
```json
{
  "webhook": {
    "id": "uuid",
    "name": "Мой сервер",
    "url": "https://myserver.com/webhook",
    "events": ["transaction.created", "budget.exceeded"],
    "is_active": true
  },
  "secret": "abc123...xyz",
  "warning": "Сохраните секрет для проверки подписи"
}
```

### Доступные события

- `transaction.created` - Создана транзакция
- `transaction.updated` - Обновлена транзакция
- `transaction.deleted` - Удалена транзакция
- `budget.exceeded` - Превышен бюджет (100%)
- `budget.warning` - Предупреждение (80%)
- `goal.achieved` - Достигнута финансовая цель
- `achievement.unlocked` - Разблокировано достижение

### Формат Webhook payload

```json
{
  "event": "transaction.created",
  "data": {
    "id": "uuid",
    "amount": 150000,
    "direction": "expense",
    "category_id": "uuid",
    "account_id": "uuid",
    "occurred_at": "2025-10-22T10:00:00Z",
    "note": "Покупка продуктов"
  },
  "user_id": "uuid",
  "occurred_at": "2025-10-22T10:00:05Z"
}
```

### Проверка подписи (HMAC)

Finappka отправляет HMAC подпись в заголовке:

```
X-Webhook-Signature: sha256_hash
X-Webhook-Event: transaction.created
X-Webhook-Timestamp: 2025-10-22T10:00:05Z
```

Проверка в Node.js:
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const calculated = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculated)
  );
}

// Express endpoint
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  console.log('Event:', req.body.event);
  console.log('Data:', req.body.data);
  
  res.status(200).send('OK');
});
```

### Retry механизм

- 3 попытки по умолчанию
- Экспоненциальная задержка: 1s, 2s, 4s
- Логирование всех попыток
- UI для просмотра логов в Settings → Webhooks

---

## n8n Integration

### Установка

```bash
npm install n8n-nodes-finappka
```

### Настройка Credentials

1. В n8n → Settings → Credentials
2. New → Finappka API
3. Вставьте API ключ
4. Save

### Примеры Workflows

#### 1. Уведомления в Telegram

```
[Finappka Trigger] → [Filter] → [Telegram]
  transaction.created   amount>5000   Send Message
```

#### 2. Синхронизация с Google Sheets

```
[Finappka Trigger] → [Google Sheets]
  transaction.created   Append Row
```

#### 3. Еженедельный отчёт

```
[Schedule] → [Finappka Get Transactions] → [Email]
  Monday 9AM   Last 7 days              Send Report
```

Полная документация: `/integrations/n8n/README.md`

---

## Примеры использования

### Python

```python
import requests

API_KEY = "your_api_key"
BASE_URL = "https://finappka.com/api/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Получить транзакции
response = requests.get(
    f"{BASE_URL}/transactions",
    headers=headers,
    params={"limit": 50, "from": "2025-10-01"}
)
transactions = response.json()["data"]

# Создать транзакцию
new_txn = {
    "amount": 100000,  # 1000 рублей в копейках
    "direction": "expense",
    "account_id": "your_account_id",
    "category_id": "your_category_id",
    "occurred_at": "2025-10-22T10:00:00Z",
    "note": "Автоматическая транзакция"
}

response = requests.post(
    f"{BASE_URL}/transactions",
    headers=headers,
    json=new_txn
)
print(response.json())
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_KEY = 'your_api_key';
const BASE_URL = 'https://finappka.com/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Получить транзакции
async function getTransactions() {
  const { data } = await api.get('/transactions', {
    params: { limit: 50, from: '2025-10-01' }
  });
  return data.data;
}

// Создать транзакцию
async function createTransaction(txn) {
  const { data } = await api.post('/transactions', txn);
  return data.data;
}

// Использование
(async () => {
  const transactions = await getTransactions();
  console.log('Транзакций:', transactions.length);
  
  const newTxn = await createTransaction({
    amount: 100000,
    direction: 'expense',
    account_id: 'uuid',
    category_id: 'uuid',
    occurred_at: new Date().toISOString(),
    note: 'Тестовая транзакция'
  });
  console.log('Создана:', newTxn.id);
})();
```

---

## Безопасность

### Best Practices

1. **Никогда не коммитьте API ключи** в Git
2. **Используйте переменные окружения**
   ```bash
   export FINAPPKA_API_KEY="your_key"
   ```
3. **Ротация ключей** - меняйте ключи регулярно
4. **Минимальные права** - создавайте ключи только с нужными scopes
5. **HTTPS only** - всегда используйте HTTPS
6. **Проверяйте webhook подписи** - защита от поддельных запросов

### Scopes

- `read` - чтение данных (GET запросы)
- `write` - создание/изменение (POST/PUT/DELETE)
- `*` - полный доступ (не рекомендуется)

---

## Rate Limiting

### Лимиты

- **По умолчанию:** 100 запросов/минуту
- **Повышенный:** 1000 запросов/минуту (по запросу)

### Обработка 429 ошибки

```javascript
async function apiRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status !== 429) {
      return response;
    }
    
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
    console.log(`Rate limited. Retry after ${retryAfter}s`);
    
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  }
  
  throw new Error('Max retries exceeded');
}
```

---

## Поддержка

- 📧 Email: support@finappka.com
- 📚 Документация: https://finappka.com/docs
- 💬 Telegram: @finappka_support
- 🐛 Issues: https://github.com/finappka/finapp/issues

---

## Changelog

### v1.0.0 (2025-10-22)
- ✅ REST API v1 (transactions, accounts, budgets, categories)
- ✅ Webhooks с retry механизмом
- ✅ n8n custom node
- ✅ Rate limiting
- ✅ HMAC подписи
- ✅ Swagger документация
