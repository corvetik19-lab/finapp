# ✅ n8n Webhook Integration — Готово!

## 🎉 Что сделано

1. ✅ Создан workflow "Finappka Webhook Integration" в n8n Cloud
2. ✅ Настроен Webhook trigger
3. ✅ Workflow активирован и готов к работе

---

## 🔗 Webhook URL

### Production URL (используйте этот!)
```
https://domik1.app.n8n.cloud/webhook/cf135bc5-aedb-4d05-8743-67db3a0f3304
```

### Test URL (для тестирования)
```
https://domik1.app.n8n.cloud/webhook-test/cf135bc5-aedb-4d05-8743-67db3a0f3304
```

---

## 🚀 Как использовать из Finappka

### Вариант 1: Отправка данных из Finappka в n8n

Когда в Finappka происходит событие (например, создание транзакции), отправляйте POST запрос на webhook:

```typescript
// Пример: отправка новой транзакции в n8n
async function notifyN8n(transaction: Transaction) {
  const webhookUrl = 'https://domik1.app.n8n.cloud/webhook/cf135bc5-aedb-4d05-8743-67db3a0f3304';
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: 'transaction.created',
      data: {
        id: transaction.id,
        amount: transaction.amount,
        direction: transaction.direction,
        category: transaction.category?.name,
        account: transaction.account?.name,
        note: transaction.note,
        occurred_at: transaction.occurred_at,
      },
    }),
  });
}
```

### Вариант 2: Тестирование через curl

```bash
# Тест webhook
curl -X POST https://domik1.app.n8n.cloud/webhook/cf135bc5-aedb-4d05-8743-67db3a0f3304 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test",
    "message": "Hello from Finappka!"
  }'
```

### Вариант 3: Интеграция в API route

Добавьте в `app/api/transactions/route.ts`:

```typescript
// После создания транзакции
const { data: newTransaction, error } = await supabase
  .from('transactions')
  .insert([transactionData])
  .select()
  .single();

if (!error && newTransaction) {
  // Уведомить n8n о новой транзакции
  fetch('https://domik1.app.n8n.cloud/webhook/cf135bc5-aedb-4d05-8743-67db3a0f3304', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'transaction.created',
      data: newTransaction,
    }),
  }).catch(err => console.error('n8n webhook error:', err));
}
```

---

## 📊 Что можно делать в n8n после получения webhook

После того как n8n получит данные от Finappka, можно:

1. **Отправить уведомление в Telegram**
   - Добавить Telegram node
   - Настроить бота
   - Отправлять сообщения о новых транзакциях

2. **Сохранить в Google Sheets**
   - Добавить Google Sheets node
   - Автоматически логировать все транзакции

3. **Отправить Email**
   - Добавить Email node (Gmail, SendGrid, etc.)
   - Отправлять отчёты

4. **Вызвать другой API**
   - Добавить HTTP Request node
   - Интегрировать с любым сервисом

5. **Обработать с помощью AI**
   - Добавить OpenAI node
   - Автокатегоризация, анализ, рекомендации

---

## 🔧 Настройка в Finappka UI

Обновите компонент `N8nManager.tsx` для работы с webhooks:

```typescript
// Вместо API ключа используем webhook URL
const [webhookUrl, setWebhookUrl] = useState('https://domik1.app.n8n.cloud/webhook/cf135bc5-aedb-4d05-8743-67db3a0f3304');

// Тест подключения
async function testWebhook() {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'test', timestamp: new Date().toISOString() }),
  });
  
  if (response.ok) {
    setMessage({ type: 'success', text: 'Webhook работает!' });
  } else {
    setMessage({ type: 'error', text: 'Webhook не отвечает' });
  }
}
```

---

## 📝 Примеры использования

### 1. Уведомления о превышении бюджета

```typescript
// В Finappka после создания транзакции
if (budgetExceeded) {
  await fetch(webhookUrl, {
    method: 'POST',
    body: JSON.stringify({
      event: 'budget.exceeded',
      data: {
        category: 'Продукты',
        spent: 15000,
        limit: 10000,
        percentage: 150,
      },
    }),
  });
}
```

### 2. Ежедневный отчёт

В n8n добавьте Schedule Trigger (каждый день в 9:00) → HTTP Request к Finappka API → Email с отчётом

### 3. Автоматическая категоризация

```typescript
// Finappka отправляет некатегоризированную транзакцию
await fetch(webhookUrl, {
  method: 'POST',
  body: JSON.stringify({
    event: 'transaction.needs_category',
    data: {
      id: transaction.id,
      note: 'Покупка в Пятёрочке',
      amount: 1500,
    },
  }),
});

// n8n обрабатывает через OpenAI → возвращает категорию → обновляет в Finappka
```

---

## 🔍 Проверка работы

### В n8n Cloud

1. Откройте workflow: https://domik1.app.n8n.cloud/workflow/pKzocNj2Dayab444
2. Перейдите на вкладку **"Executions"**
3. Отправьте тестовый запрос на webhook
4. Увидите новую execution с данными

### Тест прямо сейчас

```bash
curl -X POST https://domik1.app.n8n.cloud/webhook/cf135bc5-aedb-4d05-8743-67db3a0f3304 \
  -H "Content-Type: application/json" \
  -d '{"test": "Hello from terminal!"}'
```

Затем проверьте Executions в n8n — должна появиться новая запись!

---

## 🎯 Следующие шаги

1. ✅ Webhook создан и активирован
2. ⏭️ Добавить HTTP Request node в n8n для вызова Finappka API
3. ⏭️ Настроить Telegram бот для уведомлений
4. ⏭️ Добавить AI node для автокатегоризации
5. ⏭️ Создать Schedule trigger для ежедневных отчётов

---

## 📚 Полезные ссылки

- **Ваш workflow:** https://domik1.app.n8n.cloud/workflow/pKzocNj2Dayab444
- **n8n Webhook Docs:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- **n8n HTTP Request:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/

---

**Готово! Теперь Finappka может отправлять данные в n8n через webhook! 🎉**
