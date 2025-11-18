# 📚 API Documentation - FinApp

**Версия:** 1.0.0  
**Base URL:** `https://finappka.vercel.app/api/v1`  
**Дата:** 4 ноября 2025

---

## 🔐 Аутентификация

Все API запросы требуют аутентификации через API ключ.

### Получение API ключа

1. Войдите в приложение
2. Перейдите в **Настройки** → **API Keys**
3. Нажмите **"Создать API ключ"**
4. Сохраните ключ в безопасном месте

### Использование API ключа

Добавьте ключ в заголовок `X-API-Key`:

```bash
curl -H "X-API-Key: your-api-key-here" \
  https://finappka.vercel.app/api/v1/transactions
```

---

## 📊 Endpoints

### Транзакции

#### GET /api/v1/transactions

Получить список транзакций.

**Query Parameters:**
- `limit` (number, optional) - Количество записей (по умолчанию: 50, макс: 100)
- `offset` (number, optional) - Смещение для пагинации (по умолчанию: 0)
- `from` (string, optional) - Дата начала (ISO 8601: `2025-01-01`)
- `to` (string, optional) - Дата окончания (ISO 8601: `2025-12-31`)
- `direction` (string, optional) - Тип: `income`, `expense`, `transfer`
- `category_id` (string, optional) - UUID категории
- `account_id` (string, optional) - UUID счёта

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "amount_major": 1000.50,
      "currency": "RUB",
      "direction": "expense",
      "description": "Покупка продуктов",
      "category_id": "uuid",
      "account_id": "uuid",
      "transaction_date": "2025-11-04T10:30:00Z",
      "created_at": "2025-11-04T10:30:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

#### POST /api/v1/transactions

Создать новую транзакцию.

**Request Body:**
```json
{
  "amount_major": 1000.50,
  "currency": "RUB",
  "direction": "expense",
  "description": "Покупка продуктов",
  "category_id": "uuid",
  "account_id": "uuid",
  "transaction_date": "2025-11-04T10:30:00Z"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "amount_major": 1000.50,
    "currency": "RUB",
    "direction": "expense",
    "description": "Покупка продуктов",
    "category_id": "uuid",
    "account_id": "uuid",
    "transaction_date": "2025-11-04T10:30:00Z",
    "created_at": "2025-11-04T10:30:00Z"
  }
}
```

#### GET /api/v1/transactions/:id

Получить транзакцию по ID.

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "amount_major": 1000.50,
    "currency": "RUB",
    "direction": "expense",
    "description": "Покупка продуктов",
    "category_id": "uuid",
    "account_id": "uuid",
    "transaction_date": "2025-11-04T10:30:00Z",
    "created_at": "2025-11-04T10:30:00Z"
  }
}
```

#### PATCH /api/v1/transactions/:id

Обновить транзакцию.

**Request Body:**
```json
{
  "amount_major": 1500.00,
  "description": "Обновлённое описание"
}
```

#### DELETE /api/v1/transactions/:id

Удалить транзакцию.

**Response:**
```json
{
  "success": true
}
```

---

### Счета

#### GET /api/v1/accounts

Получить список счетов.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Сбербанк",
      "type": "debit",
      "balance_major": 50000.00,
      "currency": "RUB",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/v1/accounts

Создать новый счёт.

**Request Body:**
```json
{
  "name": "Тинькофф",
  "type": "debit",
  "balance_major": 10000.00,
  "currency": "RUB"
}
```

#### GET /api/v1/accounts/:id

Получить счёт по ID.

#### PATCH /api/v1/accounts/:id

Обновить счёт.

#### DELETE /api/v1/accounts/:id

Удалить счёт.

---

### Категории

#### GET /api/v1/categories

Получить список категорий.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Питание",
      "kind": "expense",
      "parent_id": null,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/v1/categories

Создать новую категорию.

**Request Body:**
```json
{
  "name": "Рестораны",
  "kind": "expense",
  "parent_id": "uuid"
}
```

---

### Бюджеты

#### GET /api/v1/budgets

Получить список бюджетов.

**Query Parameters:**
- `period_start` (string, optional) - Начало периода
- `period_end` (string, optional) - Конец периода

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "category_id": "uuid",
      "limit_major": 40000.00,
      "currency": "RUB",
      "period_start": "2025-11-01",
      "period_end": "2025-11-30",
      "spent": 5423.38,
      "remaining": 34576.62,
      "created_at": "2025-11-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/v1/budgets

Создать новый бюджет.

**Request Body:**
```json
{
  "category_id": "uuid",
  "limit_major": 40000.00,
  "currency": "RUB",
  "period_start": "2025-11-01",
  "period_end": "2025-11-30"
}
```

---

### Планы

#### GET /api/v1/plans

Получить список финансовых планов.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Отпуск",
      "plan_type_id": "uuid",
      "goal_amount_major": 250000.00,
      "current_amount_major": 50000.00,
      "target_date": "2025-12-31",
      "priority": "high",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/v1/plans

Создать новый план.

**Request Body:**
```json
{
  "name": "Новая машина",
  "plan_type_id": "uuid",
  "goal_amount_major": 1000000.00,
  "target_date": "2026-12-31",
  "priority": "medium"
}
```

---

### Аналитика

#### GET /api/v1/analytics/summary

Получить сводку по финансам.

**Query Parameters:**
- `from` (string, required) - Дата начала
- `to` (string, required) - Дата окончания

**Response:**
```json
{
  "data": {
    "total_income": 100000.00,
    "total_expense": 75000.00,
    "net_income": 25000.00,
    "top_categories": [
      {
        "category_id": "uuid",
        "category_name": "Питание",
        "amount": 20000.00,
        "percentage": 26.67
      }
    ],
    "daily_average": 2500.00,
    "transactions_count": 150
  }
}
```

#### GET /api/v1/analytics/trends

Получить тренды по периодам.

**Query Parameters:**
- `from` (string, required) - Дата начала
- `to` (string, required) - Дата окончания
- `group_by` (string, optional) - Группировка: `day`, `week`, `month` (по умолчанию: `month`)

**Response:**
```json
{
  "data": [
    {
      "period": "2025-11",
      "income": 80000.00,
      "expense": 60000.00,
      "net": 20000.00
    }
  ]
}
```

---

## ⚠️ Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 201 | Ресурс создан |
| 400 | Неверный запрос |
| 401 | Не авторизован (неверный API ключ) |
| 403 | Доступ запрещён |
| 404 | Ресурс не найден |
| 429 | Превышен лимит запросов |
| 500 | Внутренняя ошибка сервера |

**Пример ошибки:**
```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API ключ недействителен или истёк",
    "details": {}
  }
}
```

---

## 🚦 Rate Limiting

- **По умолчанию:** 1000 запросов в час
- **Настраивается** при создании API ключа (100-10000 req/hour)

Заголовки ответа:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699027200
```

---

## 📝 Примеры использования

### JavaScript/TypeScript

```typescript
const API_KEY = 'your-api-key-here';
const BASE_URL = 'https://finappka.vercel.app/api/v1';

async function getTransactions() {
  const response = await fetch(`${BASE_URL}/transactions?limit=10`, {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data;
}

async function createTransaction(transaction) {
  const response = await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(transaction)
  });
  
  return response.json();
}
```

### Python

```python
import requests

API_KEY = 'your-api-key-here'
BASE_URL = 'https://finappka.vercel.app/api/v1'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# Получить транзакции
response = requests.get(f'{BASE_URL}/transactions', headers=headers)
transactions = response.json()

# Создать транзакцию
new_transaction = {
    'amount_major': 1000.50,
    'currency': 'RUB',
    'direction': 'expense',
    'description': 'Покупка',
    'category_id': 'uuid',
    'account_id': 'uuid',
    'transaction_date': '2025-11-04T10:30:00Z'
}

response = requests.post(
    f'{BASE_URL}/transactions',
    headers=headers,
    json=new_transaction
)
result = response.json()
```

### cURL

```bash
# Получить транзакции
curl -X GET "https://finappka.vercel.app/api/v1/transactions?limit=10" \
  -H "X-API-Key: your-api-key-here"

# Создать транзакцию
curl -X POST "https://finappka.vercel.app/api/v1/transactions" \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_major": 1000.50,
    "currency": "RUB",
    "direction": "expense",
    "description": "Покупка продуктов",
    "category_id": "uuid",
    "account_id": "uuid",
    "transaction_date": "2025-11-04T10:30:00Z"
  }'
```

---

## 🔄 Webhooks (Coming Soon)

В будущих версиях будет доступна возможность подписки на события:
- `transaction.created`
- `transaction.updated`
- `transaction.deleted`
- `budget.exceeded`
- `plan.completed`

---

## 📞 Поддержка

- **Email:** support@finappka.ru
- **Документация:** https://finappka.vercel.app/docs
- **GitHub:** https://github.com/finappka

---

**Версия документации:** 1.0.0  
**Последнее обновление:** 4 ноября 2025
