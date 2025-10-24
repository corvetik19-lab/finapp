# ⚡ Webhooks: Быстрая настройка за 5 минут

**Пошаговая инструкция для получения мгновенных уведомлений**

---

## ✅ Что тебе понадобится:

- n8n Cloud аккаунт (бесплатно)
- API ключ из Finappka
- Telegram бот (опционально)
- 5 минут времени

---

## 🚀 Шаг 1: Настрой Webhook в n8n Cloud

### 1.1. Импортируй workflow

1. **Скачай файл:**
   ```
   /workflows/webhook-telegram-instant.json
   ```

2. **В n8n Cloud:**
   - Workflows → "+" → Import from File
   - Выбери `webhook-telegram-instant.json`
   - Нажми "Import"

### 1.2. Получи Webhook URL

1. **Открой импортированный workflow**

2. **Нажми на node "Webhook Trigger"**

3. **Скопируй Production URL:**
   ```
   https://твой-workspace.app.n8n.cloud/webhook/finappka-webhook
   ```

4. **Сохрани этот URL!** Он понадобится в шаге 3.

### 1.3. Настрой Telegram (если нужно)

1. **В workflow найди node "Send to Telegram"**

2. **Настрой Telegram credentials:**
   - Credentials → Telegram API
   - Добавь свой бот токен

3. **Укажи Chat ID:**
   - Settings → Environments
   - `TELEGRAM_CHAT_ID` = твой ID

---

## 🔐 Шаг 2: Создай секрет для подписи

### 2.1. Сгенерируй случайную строку

**В PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

**Результат (пример):**
```
aB3dE7fG9hJ2kL4mN6pQ8rS1tU5vW0xY
```

### 2.2. Сохрани секрет в n8n

1. **Settings → Environments**

2. **Добавь переменную:**
   ```
   Name: FINAPPKA_WEBHOOK_SECRET
   Value: aB3dE7fG9hJ2kL4mN6pQ8rS1tU5vW0xY
   ```

3. **Save**

### 2.3. Сохрани секрет для следующего шага

Скопируй эту же строку - она понадобится для регистрации webhook в Finappka.

---

## 📡 Шаг 3: Зарегистрируй Webhook в Finappka

### 3.1. Через API (рекомендуется)

**В PowerShell:**

```powershell
$headers = @{
    "Authorization" = "Bearer fpa_live_твой_api_ключ"
    "Content-Type" = "application/json"
}

$body = @{
    url = "https://твой-workspace.app.n8n.cloud/webhook/finappka-webhook"
    events = @("transaction.created")
    secret = "aB3dE7fG9hJ2kL4mN6pQ8rS1tU5vW0xY"
    name = "n8n Telegram Notifications"
    description = "Мгновенные уведомления в Telegram"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://твой-домен.com/api/v1/webhooks" `
    -Method Post `
    -Headers $headers `
    -Body $body
```

**Замени:**
- `fpa_live_твой_api_ключ` → твой API ключ из Finappka
- `https://твой-workspace.app.n8n.cloud/webhook/finappka-webhook` → URL из шага 1.2
- `aB3dE7fG9hJ2kL4mN6pQ8rS1tU5vW0xY` → секрет из шага 2.1
- `https://твой-домен.com` → URL твоего Finappka (ngrok или production)

### 3.2. Проверь результат

**Успешный ответ:**
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

**✅ Webhook зарегистрирован!**

---

## ▶️ Шаг 4: Активируй Workflow

### 4.1. В n8n Cloud

1. **Открой workflow**

2. **Включи переключатель "Active"** (вверху справа)

3. **Статус должен стать:** 🟢 Active

**✅ Workflow активен и ждёт события!**

---

## 🧪 Шаг 5: Протестируй!

### 5.1. Создай транзакцию

1. **Открой Finappka**

2. **Создай новую транзакцию:**
   - Сумма: 500₽
   - Категория: Продукты
   - Заметка: Тест webhook

3. **Сохрани**

### 5.2. Проверь Telegram

**Через 1-2 секунды должно прийти:**

```
💸 Новая транзакция!

💵 Сумма: 500₽
📁 Категория: Продукты
💳 Счёт: Основная карта
📝 Заметка: Тест webhook
📅 Дата: 23.10.2024 21:30

🔔 Мгновенное уведомление через Webhook
```

### 5.3. Проверь логи в n8n

1. **Executions** (в n8n Cloud)

2. **Должен быть новый execution:**
   - Status: ✅ Success
   - Duration: ~1-2 сек

**🎉 РАБОТАЕТ!**

---

## 📊 Мониторинг

### Статистика webhook в Finappka

**Получи статистику:**

```powershell
$headers = @{
    "Authorization" = "Bearer fpa_live_твой_ключ"
}

Invoke-RestMethod -Uri "https://твой-домен.com/api/v1/webhooks" `
    -Method Get `
    -Headers $headers
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
      "total_calls": 15,
      "failed_calls": 0,
      "last_triggered_at": "2024-10-23T21:30:00Z",
      "last_success_at": "2024-10-23T21:30:00Z"
    }
  ]
}
```

---

## ⚙️ Дополнительные настройки

### Подписка на несколько событий

```powershell
$body = @{
    url = "https://..."
    events = @(
        "transaction.created",
        "transaction.updated",
        "budget.exceeded"
    )
    secret = "..."
    name = "Все события"
} | ConvertTo-Json
```

### Отключить webhook

```powershell
Invoke-RestMethod -Uri "https://твой-домен.com/api/v1/webhooks/abc-123" `
    -Method Put `
    -Headers $headers `
    -Body '{"is_active": false}' `
    -ContentType "application/json"
```

### Удалить webhook

```powershell
Invoke-RestMethod -Uri "https://твой-домен.com/api/v1/webhooks/abc-123" `
    -Method Delete `
    -Headers $headers
```

---

## ❓ Проблемы?

### Webhook не срабатывает

**Проверь:**

1. ✅ Workflow активен (зелёный статус)
2. ✅ URL правильный (без опечаток)
3. ✅ Секрет совпадает в n8n и Finappka
4. ✅ События правильные (`transaction.created`)

### Ошибка "Invalid signature"

**Причина:** Секрет не совпадает

**Решение:**
1. Проверь `FINAPPKA_WEBHOOK_SECRET` в n8n
2. Проверь `secret` в webhook
3. Они должны быть ОДИНАКОВЫМИ

### Telegram не отправляется

**Проверь:**
1. Telegram credentials настроены
2. `TELEGRAM_CHAT_ID` правильный
3. Бот добавлен в чат
4. Посмотри логи в Executions

---

## 🎓 Итого

### Что ты настроил:

✅ **Webhook в n8n Cloud** - принимает события  
✅ **HMAC подпись** - безопасность  
✅ **Webhook в Finappka** - отправляет события  
✅ **Telegram уведомления** - мгновенные сообщения  

### Что получаешь:

⚡ **Мгновенные уведомления** (1-2 секунды)  
🎯 **Только нужные события**  
🔐 **Безопасно** (HMAC подпись)  
💪 **Надёжно** (автоматические retry)  

---

## 📚 Дальше читай:

- 📖 [WEBHOOKS.md](./WEBHOOKS.md) - полная документация
- 🚀 [GETTING-STARTED.md](./GETTING-STARTED.md) - общая настройка n8n
- 📊 [README.md](./README.md) - обзор интеграции

---

**Поздравляю! Теперь ты получаешь мгновенные уведомления! 🎉**

*Последнее обновление: 23 октября 2024*
