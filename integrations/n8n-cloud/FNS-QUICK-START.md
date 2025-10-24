# ⚡ ФНС Telegram → Finappka: Быстрый старт

**Настройка за 10 минут!**

---

## ✅ Чеклист

- [ ] Telegram бот создан
- [ ] OpenAI API ключ получен
- [ ] n8n Cloud аккаунт есть
- [ ] Finappka запущен
- [ ] Workflow импортирован
- [ ] Credentials настроены
- [ ] Workflow активирован
- [ ] Первый чек протестирован

---

## 🚀 Шаг 1: Создай бота (2 минуты)

```
1. Открой @BotFather в Telegram
2. /newbot
3. Имя: Finappka Import Bot
4. Username: finappka_import_bot
5. Сохрани токен: 123456789:ABC...
```

---

## 🔑 Шаг 2: OpenAI ключ (3 минуты)

```
1. https://platform.openai.com/signup
2. API Keys → Create new
3. Сохрани: sk-proj-abc123...
4. Пополни баланс: $5
```

---

## 📡 Шаг 3: n8n Cloud (5 минут)

### 3.1. Импортируй workflow

```
workflows/telegram-fns-to-finappka.json
→ n8n Cloud → Import
```

### 3.2. Credentials

**Telegram Bot:**
```
Name: ФНС Bot
Token: 123456789:ABC...
```

**OpenAI:**
```
Name: OpenAI
API Key: sk-proj-abc123...
```

**Finappka API:**
```
Name: Finappka API
Header: Authorization
Value: Bearer fpa_live_твой_ключ
```

### 3.3. Environment

```
FINAPPKA_BASE_URL = https://твой-домен.com
```

### 3.4. Примени credentials

```
Telegram Bot → ФНС Bot
AI Categorize → OpenAI
Import to Finappka → Finappka API
Send Success → ФНС Bot
Send Error → ФНС Bot
```

### 3.5. Активируй

```
Active → ON
```

---

## 🧪 Шаг 4: Тестируй!

```
1. Получи чек от ФНС бота
2. Перешли своему боту
3. Жди 3-5 секунд
4. Получи подтверждение
5. Проверь Finappka
```

---

## 📊 Пример чека

**Входящее сообщение:**
```
ООО "ПЯТЁРОЧКА"

Молоко 3,5%      89.90
Хлеб белый       45.00
Бургер          199.00

ИТОГО:          333.90₽
```

**Ответ бота:**
```
✅ Чек обработан!

🏪 Магазин: ООО "ПЯТЁРОЧКА"
💰 Сумма: 333.90₽
📁 Категория: Продукты

📦 Товары:
• Молоко 3,5% - 89.90₽ (Продукты)
• Хлеб белый - 45.00₽ (Продукты)
• Бургер - 199.00₽ (Кафе/Рестораны)

✨ Транзакции созданы!
```

---

## 💰 Стоимость

| Сервис | Цена |
|--------|------|
| Telegram Bot | Бесплатно |
| n8n Cloud | Бесплатно (20k/мес) |
| OpenAI GPT-4o-mini | ~$0.01 за 100 чеков |

**Итого:** Практически бесплатно! 🎉

---

## ⚠️ Проблемы?

### Бот не отвечает
```
✅ Workflow активен?
✅ Credentials настроены?
✅ Пересылаешь от ФНС бота?
```

### Не распознаёт чек
```
Перешли именно сообщение от ФНС бота
Проверь что есть товары и суммы
```

### AI ошибается
```
Улучши промпт в "AI Categorize"
Используй GPT-4o вместо GPT-4o-mini
```

---

## 📚 Полная документация

[FNS-TELEGRAM-SETUP.md](./FNS-TELEGRAM-SETUP.md)

---

**🎊 Готово! Чеки импортируются автоматически! 🤖**
