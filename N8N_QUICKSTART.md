# 🚀 Быстрый старт n8n с Finappka

## Вариант 1: n8n Cloud (рекомендуется)

### Шаг 1: Регистрация в n8n Cloud
1. Открыть https://n8n.io/cloud
2. Нажать "Start for free"
3. Зарегистрироваться (email + пароль)
4. Подтвердить email

**Ваш URL:** `https://ваше-имя.app.n8n.cloud`

### Шаг 2: Получить API ключ
1. Войти в n8n Cloud
2. Перейти: **Settings** (⚙️) → **API**
3. Нажать **"Create API Key"**
4. Скопировать ключ (показывается один раз!)
5. Сохранить в безопасном месте

**Формат ключа:** `n8n_api_xxx...`

### Шаг 3: Настроить Finappka
1. Запустить Finappka: `npm run dev`
2. Открыть: http://localhost:3000
3. Войти в аккаунт
4. Перейти: **Настройки** → **n8n Автоматизация**
5. Заполнить:
   - **URL:** `https://ваше-имя.app.n8n.cloud`
   - **API Key:** вставить скопированный ключ
6. Нажать **"Проверить подключение"**
7. Если успешно → **"Сохранить"**

### Шаг 4: Импортировать готовый workflow
1. В n8n Cloud: **Workflows** → **"+" (New)**
2. Нажать **Import from File**
3. Выбрать файл из `/integrations/n8n-cloud/workflows/`:
   - `get-transactions.json` - получение транзакций
   - `create-transaction.json` - создание транзакции
   - `telegram-notifications.json` - уведомления в Telegram
4. После импорта настроить credentials (см. ниже)

---

## Вариант 2: Self-hosted (Docker)

### Требования
- Docker Desktop установлен
- Порт 5678 свободен

### Шаг 1: Запустить n8n
```bash
# Перейти в папку проекта
cd c:\fin3\finapp

# Запустить n8n через Docker Compose
docker-compose -f docker-compose.n8n.yml up -d

# Проверить статус
docker ps
```

### Шаг 2: Открыть n8n
```
http://localhost:5678
```

**Логин:**
- Username: `admin`
- Password: `change_this_password` (измените в docker-compose.n8n.yml!)

### Шаг 3: Получить API ключ
1. Войти в n8n (http://localhost:5678)
2. Перейти: **Settings** → **API**
3. Нажать **"Create API Key"**
4. Скопировать ключ

### Шаг 4: Настроить Finappka
1. Открыть Finappka: http://localhost:3000
2. Перейти: **Настройки** → **n8n Автоматизация**
3. Заполнить:
   - **URL:** `http://localhost:5678`
   - **API Key:** вставить ключ
4. **"Проверить подключение"** → **"Сохранить"**

---

## Настройка Credentials в n8n

### Для работы с Finappka API

1. В n8n перейти: **Settings** → **Credentials**
2. Нажать **"+ New Credential"**
3. Выбрать: **"HTTP Header Auth"**
4. Заполнить:
   ```
   Credential Name: Finappka API
   Name: Authorization
   Value: Bearer YOUR_FINAPPKA_API_KEY
   ```
5. Нажать **"Save"**

**Где взять Finappka API Key?**
- Пока API ключи не реализованы в Finappka
- Используйте Supabase anon key как временное решение:
  ```
  Authorization: Bearer YOUR_SUPABASE_ANON_KEY
  ```

---

## Тестирование подключения

### Тест 1: Получить транзакции

1. Импортировать `get-transactions.json`
2. Открыть workflow
3. В HTTP Request node:
   - **URL:** `http://localhost:3000/api/v1/transactions`
   - **Authentication:** Finappka API (credential)
4. Нажать **"Execute Node"**
5. Проверить результат

### Тест 2: Создать транзакцию

1. Импортировать `create-transaction.json`
2. В HTTP Request node настроить:
   - **Method:** POST
   - **URL:** `http://localhost:3000/api/v1/transactions`
   - **Body:**
     ```json
     {
       "amount": 50000,
       "direction": "expense",
       "account_id": "ваш-account-uuid",
       "category_id": "ваш-category-uuid",
       "note": "Тест из n8n"
     }
     ```
3. **"Execute Node"**
4. Проверить в Finappka → Транзакции

---

## Готовые Workflows

### 📥 Get Transactions
**Файл:** `/integrations/n8n-cloud/workflows/get-transactions.json`

**Что делает:**
- Получает список транзакций из Finappka
- Фильтрует по дате/категории
- Можно использовать для экспорта в Google Sheets/Excel

### 📤 Create Transaction
**Файл:** `/integrations/n8n-cloud/workflows/create-transaction.json`

**Что делает:**
- Создаёт новую транзакцию в Finappka
- Можно триггерить из Telegram/Email/Webhook

### 🔔 Telegram Notifications
**Файл:** `/integrations/n8n-cloud/workflows/telegram-notifications.json`

**Что делает:**
- Каждые 5 минут проверяет новые транзакции
- Отправляет уведомления в Telegram
- Требует настройки Telegram Bot

### 🤖 ФНС → AI → Finappka
**Файл:** `/integrations/n8n-cloud/workflows/telegram-fns-to-finappka.json`

**Что делает:**
- Получает чеки из Telegram бота ФНС
- Парсит данные чека
- Использует AI для категоризации
- Создаёт транзакцию в Finappka

---

## Troubleshooting

### ❌ "Не удалось подключиться к n8n"

**Причины:**
1. n8n не запущен
2. Неверный URL
3. Неверный API ключ
4. Firewall блокирует

**Решение:**
```bash
# Проверить, что n8n работает
docker ps | grep n8n

# Проверить логи
docker logs finapp-n8n

# Перезапустить
docker-compose -f docker-compose.n8n.yml restart
```

### ❌ "Request failed with status code 401"

**Причина:** Неверный API ключ

**Решение:**
1. Пересоздать API ключ в n8n
2. Обновить в Finappka → Настройки → n8n

### ❌ "ECONNREFUSED"

**Причина:** Finappka недоступен для n8n

**Решение для локальной разработки:**
1. Использовать ngrok для публичного URL:
   ```bash
   ngrok http 3000
   ```
2. В n8n использовать ngrok URL вместо localhost

---

## Следующие шаги

1. ✅ Подключить n8n
2. ✅ Импортировать workflows
3. ✅ Настроить credentials
4. ⏭️ Настроить Telegram бота (опционально)
5. ⏭️ Настроить AI категоризацию (опционально)
6. ⏭️ Создать свои workflows

---

## Полезные ссылки

- **n8n Documentation:** https://docs.n8n.io
- **n8n Community:** https://community.n8n.io
- **n8n Workflows Library:** https://n8n.io/workflows
- **Finappka API Docs:** `/integrations/n8n-cloud/README.md`

---

**Готово! Теперь можно автоматизировать финансы! 🎉**
