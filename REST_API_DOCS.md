# 🔌 FinApp REST API Documentation

## Базовая информация

**Base URL:** `https://your-domain.vercel.app/api/v1`  
**Аутентификация:** API Key в заголовке `X-API-Key`  
**Формат:** JSON  
**Rate Limit:** По умолчанию 1000 запросов/час

---

## Получение API Key

1. Войдите в FinApp
2. Перейдите в Settings → API Keys
3. Создайте новый ключ
4. Сохраните ключ (показывается только один раз!)

---

## Аутентификация

Все запросы должны содержать заголовок:

```
X-API-Key: your-api-key-here
```

---

## Endpoints

### Транзакции

#### GET /api/v1/transactions
Получить список транзакций

**Query Parameters:**
- `limit` (integer, optional): Количество записей (default: 50, max: 100)
- `offset` (integer, optional): Смещение (default: 0)
- `from` (string, optional): Дата начала (YYYY-MM-DD)
- `to` (string, optional): Дата конца (YYYY-MM-DD)
- `direction` (string, optional): `income` | `expense` | `transfer`
- `account_id` (uuid, optional): Фильтр по счёту
- `category_id` (uuid, optional): Фильтр по категории

**Пример запроса:**
```bash
curl -X GET "https://your-domain.vercel.app/api/v1/transactions?limit=10&from=2025-01-01" \
  -H "X-API-Key: fapp_your-key-here"
```

**Пример ответа:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "account_id": "uuid",
      "category_id": "uuid",
      "amount": 50000,
      "direction": "expense",
      "date": "2025-10-11",
      "description": "Продукты",
      "tags": ["еда", "супермаркет"],
      "created_at": "2025-10-11T20:00:00Z",
      "accounts": {
        "id": "uuid",
        "name": "Основной",
        "type": "checking",
        "currency": "RUB"
      },
      "categories": {
        "id": "uuid",
        "name": "Продукты",
        "type": "expense",
        "icon": "shopping_cart"
      }
    }
  ],
  "meta": {
    "total": 150,
    "limit": 10,
    "offset": 0
  }
}
```

#### POST /api/v1/transactions
Создать новую транзакцию

**Требуется scope:** `write`

**Body:**
```json
{
  "amount": 50000,
  "direction": "expense",
  "account_id": "uuid",
  "category_id": "uuid",
  "date": "2025-10-11",
  "description": "Описание",
  "tags": ["тег1", "тег2"]
}
```

**Пример запроса:**
```bash
curl -X POST "https://your-domain.vercel.app/api/v1/transactions" \
  -H "X-API-Key: fapp_your-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "direction": "expense",
    "account_id": "uuid",
    "category_id": "uuid",
    "date": "2025-10-11",
    "description": "Кофе"
  }'
```

---

### Счета

#### GET /api/v1/accounts
Получить список счетов

**Пример запроса:**
```bash
curl -X GET "https://your-domain.vercel.app/api/v1/accounts" \
  -H "X-API-Key: fapp_your-key-here"
```

**Пример ответа:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Основной",
      "type": "checking",
      "balance": 100000,
      "currency": "RUB",
      "bank": "Сбербанк",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### Категории

#### GET /api/v1/categories
Получить список категорий

**Query Parameters:**
- `type` (string, optional): `income` | `expense`

**Пример запроса:**
```bash
curl -X GET "https://your-domain.vercel.app/api/v1/categories?type=expense" \
  -H "X-API-Key: fapp_your-key-here"
```

---

### Бюджеты

#### GET /api/v1/budgets
Получить список бюджетов

**Пример запроса:**
```bash
curl -X GET "https://your-domain.vercel.app/api/v1/budgets" \
  -H "X-API-Key: fapp_your-key-here"
```

**Пример ответа:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "category_id": "uuid",
      "limit_amount": 50000,
      "spent": 35000,
      "period_start": "2025-10-01",
      "period_end": "2025-10-31",
      "currency": "RUB",
      "categories": {
        "name": "Продукты",
        "icon": "shopping_cart"
      }
    }
  ]
}
```

---

## Response Headers

Каждый успешный ответ включает заголовки:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-Response-Time: 45ms
```

---

## Коды ответов

| Код | Описание |
|-----|----------|
| 200 | OK - Запрос выполнен успешно |
| 201 | Created - Ресурс создан |
| 400 | Bad Request - Неверный формат запроса |
| 401 | Unauthorized - Отсутствует или неверный API ключ |
| 403 | Forbidden - Недостаточно прав (scope) |
| 429 | Too Many Requests - Превышен rate limit |
| 500 | Internal Server Error - Ошибка сервера |

---

## Типы данных

### Transaction
```typescript
{
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  amount: number; // в копейках (50000 = 500.00)
  direction: "income" | "expense" | "transfer";
  date: string; // YYYY-MM-DD
  description?: string;
  tags?: string[];
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

### Account
```typescript
{
  id: string;
  user_id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "cash";
  balance: number; // в копейках
  currency: string; // ISO 4217 (RUB, USD, EUR)
  bank?: string;
  is_active: boolean;
}
```

### Category
```typescript
{
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  icon?: string;
  color?: string;
  parent_id?: string;
}
```

---

## Scopes (Разрешения)

- **read** - Чтение данных (GET запросы)
- **write** - Создание и изменение данных (POST, PUT)
- **delete** - Удаление данных (DELETE)

Вы можете выбрать необходимые scopes при создании API ключа.

---

## Лучшие практики

1. **Хранение ключей**: Никогда не храните API ключи в публичных репозиториях
2. **HTTPS**: Всегда используйте HTTPS для API запросов
3. **Rate Limiting**: Кэшируйте данные чтобы не превышать лимиты
4. **Обработка ошибок**: Проверяйте статус код и обрабатывайте ошибки
5. **Истечение ключей**: Используйте ключи с ограниченным сроком действия
6. **Минимальные права**: Выдавайте только необходимые scopes

---

## Примеры интеграций

### Node.js / JavaScript

```javascript
const FINAPP_API_KEY = process.env.FINAPP_API_KEY;
const BASE_URL = 'https://your-domain.vercel.app/api/v1';

async function getTransactions() {
  const response = await fetch(`${BASE_URL}/transactions?limit=10`, {
    headers: {
      'X-API-Key': FINAPP_API_KEY
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}
```

### Python

```python
import requests
import os

FINAPP_API_KEY = os.environ.get('FINAPP_API_KEY')
BASE_URL = 'https://your-domain.vercel.app/api/v1'

def get_transactions():
    headers = {
        'X-API-Key': FINAPP_API_KEY
    }
    
    response = requests.get(
        f'{BASE_URL}/transactions',
        headers=headers,
        params={'limit': 10}
    )
    
    response.raise_for_status()
    return response.json()
```

---

## Поддержка

Если у вас возникли вопросы или проблемы с API:
1. Проверьте логи использования в разделе API Keys
2. Убедитесь что API ключ активен и не истёк
3. Проверьте что у ключа есть необходимые scopes

---

## Changelog

### v1.0.0 (2025-10-11)
- Первый релиз REST API
- Endpoints: transactions, accounts, categories, budgets
- Rate limiting 1000 req/hour
- Scopes: read, write, delete
