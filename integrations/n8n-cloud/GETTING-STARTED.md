# 🚀 Getting Started: Finappka + n8n Cloud

**Пошаговая инструкция для начинающих**

---

## 📋 Что тебе понадобится:

- ✅ **Email** для регистрации в n8n Cloud
- ✅ **Finappka** запущен (локально или на сервере)
- ✅ **10 минут времени**

---

## 🎯 Шаг 1: Регистрация в n8n Cloud

### 1.1. Открой сайт

**Ссылка:** https://n8n.io/cloud

### 1.2. Нажми "Start for free"

![n8n homepage](https://n8n.io/_ipx/w_1920,q_75/https%3A%2F%2Fn8n.io%2Fimages%2Fhero-cloud.png%3Fv%3D1)

### 1.3. Заполни регистрационную форму

```
Email: твой-email@example.com
Password: надёжный-пароль
```

### 1.4. Подтверди email

- Открой письмо от n8n
- Нажми на ссылку подтверждения

### 1.5. Выбери имя workspace

```
Workspace Name: finappka-automation
```

**✅ Готово!** Ты в n8n Cloud!

**Твой URL:** `https://finappka-automation.app.n8n.cloud`

---

## 🔑 Шаг 2: Получить API ключ из Finappka

### 2.1. Запусти Finappka (если ещё не запущен)

```bash
cd C:\fin3\finapp
npm run dev
```

**Откроется:** http://localhost:3000

### 2.2. Войди в аккаунт

Если нет аккаунта - зарегистрируйся.

### 2.3. Перейди в Settings

```
Меню → Settings → Developer → API Keys
```

### 2.4. Создай новый API ключ

**Нажми:** "+ Create API Key"

**Заполни:**
```
Name: n8n Cloud Integration
Description: Автоматизация через n8n
Scopes:
  ☑️ read  - чтение данных
  ☑️ write - создание/изменение данных
```

**Нажми:** "Create"

### 2.5. СОХРАНИ КЛЮЧ!

**⚠️ ВАЖНО:** Ключ показывается только ОДИН РАЗ!

```
fpa_live_abc123def456ghi789jkl012mno345pqr
```

**Скопируй его в блокнот или менеджер паролей!**

---

## 🌐 Шаг 3: Сделать Finappka доступным из интернета

**Зачем?** n8n Cloud находится в облаке и должен иметь доступ к твоему Finappka API.

### Вариант A: Используй ngrok (самый простой для теста)

#### 3.1. Установи ngrok

**Windows (PowerShell):**
```powershell
choco install ngrok
```

**Или скачай:** https://ngrok.com/download

#### 3.2. Зарегистрируйся на ngrok.com

https://dashboard.ngrok.com/signup

#### 3.3. Получи authtoken

https://dashboard.ngrok.com/get-started/your-authtoken

```bash
ngrok config add-authtoken твой-токен
```

#### 3.4. Запусти туннель

```bash
ngrok http 3000
```

**Результат:**
```
Forwarding  https://abc123def456.ngrok-free.app -> http://localhost:3000
```

**✅ Твой публичный URL:** `https://abc123def456.ngrok-free.app`

**⚠️ Важно:** Не закрывай окно ngrok, пока работаешь с n8n!

### Вариант B: Деплой в продакшен (для постоянного использования)

**Рекомендуемые платформы:**
- **Vercel:** https://vercel.com (бесплатно для hobby)
- **Railway:** https://railway.app
- **Fly.io:** https://fly.io

**После деплоя получишь постоянный URL типа:**
```
https://finappka.vercel.app
```

---

## 🔐 Шаг 4: Настроить Credentials в n8n Cloud

### 4.1. Открой n8n Cloud

Твой URL типа: `https://finappka-automation.app.n8n.cloud`

### 4.2. Перейди в Settings

**Меню (⚙️)** → **Credentials**

### 4.3. Создай новый Credential

**Нажми:** "+ New Credential"

### 4.4. Найди "HTTP Header Auth"

В поиске введи: `http header`

Выбери: **"HTTP Header Auth"**

### 4.5. Заполни форму

```
Credential Name: Finappka API

Name: Authorization

Value: Bearer fpa_live_abc123... (твой API ключ из шага 2)
```

**⚠️ Важно:** Не забудь слово `Bearer` перед ключом!

**Полный пример:**
```
Bearer fpa_live_abc123def456ghi789jkl012mno345pqr
```

### 4.6. Сохрани

**Нажми:** "Save"

**✅ Credential создан!**

---

## 🔧 Шаг 5: Настроить Environment Variables

### 5.1. В n8n Cloud перейди: Settings → Environments

### 5.2. Создай переменную FINAPPKA_BASE_URL

```
Name: FINAPPKA_BASE_URL
Value: https://abc123def456.ngrok-free.app
       (или твой постоянный URL)
```

### 5.3. (Опционально) Для Telegram

```
Name: TELEGRAM_CHAT_ID
Value: твой Telegram chat ID
```

**Как получить chat ID:**
1. Открой Telegram
2. Найди бота: @userinfobot
3. Нажми /start
4. Скопируй свой ID

**Сохрани**

---

## 📥 Шаг 6: Импортировать готовый Workflow

### 6.1. Скачай workflow

Перейди в папку:
```
C:\fin3\finapp\integrations\n8n-cloud\workflows\
```

Выбери один из:
- `get-transactions.json` - просмотр транзакций
- `create-transaction.json` - создание транзакции
- `telegram-notifications.json` - уведомления в Telegram

### 6.2. Импортируй в n8n Cloud

**В n8n Cloud:**

1. **Нажми:** Workflows → "+" (вверху справа)
2. **Выбери:** "Import from File"
3. **Выбери файл:** например, `get-transactions.json`
4. **Нажми:** "Import"

**✅ Workflow импортирован!**

### 6.3. Настрой Credentials в Workflow

**Открой импортированный workflow**

Найди **HTTP Request** node (например, "Get Transactions")

**Настрой:**
1. Нажми на node
2. В поле **Authentication** выбери: "Predefined Credential Type"
3. **Credential Type:** HTTP Header Auth
4. **Credential Name:** Finappka API (тот что создали в шаге 4)

**Сохрани:** Ctrl+S

---

## ▶️ Шаг 7: Протестировать Workflow

### 7.1. Выполни вручную

**Нажми:** "Test workflow" (вверху)

**Или:** "Execute Node" на конкретном node

### 7.2. Проверь результат

Если всё настроено правильно, увидишь:

```json
{
  "transactions": [
    {
      "id": "123",
      "amount_rub": "500.00",
      "direction": "expense",
      "category": "Продукты",
      ...
    }
  ]
}
```

### 7.3. Если ошибка

**401 Unauthorized:**
- Проверь API ключ
- Убедись что написал `Bearer` перед ключом

**Connection refused:**
- Проверь что Finappka запущен
- Проверь что ngrok работает
- Проверь URL в environment variable

**404 Not Found:**
- Проверь URL в FINAPPKA_BASE_URL
- Должно быть: `/api/v1/transactions`

---

## 🔄 Шаг 8: Активировать Workflow

### 8.1. Для workflows с триггерами (Schedule, Webhook)

**Включи переключатель "Active"** (вверху справа)

**Статус должен быть:** 🟢 Active

### 8.2. Для ручных workflows

Оставляй неактивным, запускай кнопкой "Test workflow"

---

## ✅ Готово! Что дальше?

### 🎯 Попробуй другие workflows:

1. **Create Transaction** - создание транзакций из n8n
2. **Telegram Notifications** - автоуведомления
3. **Google Sheets Sync** - синхронизация с таблицами

### 📚 Изучи документацию:

- **Полный README:** `/integrations/n8n-cloud/README.md`
- **API Endpoints:** `/integrations/n8n-cloud/README.md#api-endpoints`
- **Примеры:** `/integrations/n8n-cloud/workflows/`

### 🚀 Создай свои автоматизации:

- Еженедельные отчёты
- Оповещения о превышении бюджета
- Автосохранение чеков из Email
- Интеграция с банковскими выписками

---

## 🆘 Проблемы?

### Не работает?

1. Проверь что Finappka запущен
2. Проверь что ngrok работает (зелёный статус)
3. Проверь API ключ в credentials
4. Проверь environment variables
5. Посмотри логи в n8n: Executions → последний execution

### Нужна помощь?

- **Документация n8n:** https://docs.n8n.io
- **Community:** https://community.n8n.io
- **GitHub Issues:** https://github.com/corvetik19-lab/finapp/issues

---

## 🎉 Поздравляю!

Ты настроил автоматизацию Finappka через n8n Cloud!

**Теперь можешь:**
- ✅ Автоматически получать уведомления
- ✅ Синхронизировать данные
- ✅ Создавать отчёты
- ✅ Интегрировать с 400+ сервисами

**Happy automating! 🚀**
