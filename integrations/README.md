# 🔗 Finappka Integrations

**Интеграции Finappka с внешними сервисами**

---

## 📦 Доступные интеграции

### 🌩️ **n8n Cloud**

**Что это:** Облачный сервис автоматизации без установки

**Путь:** `/integrations/n8n-cloud/`

**Документация:**
- 📖 [README.md](./n8n-cloud/README.md) - Полное руководство
- 🚀 [GETTING-STARTED.md](./n8n-cloud/GETTING-STARTED.md) - Быстрый старт
- 📊 [SUMMARY.md](./n8n-cloud/SUMMARY.md) - Краткий обзор

**Готовые Workflows:**
- ✅ Получение транзакций
- ✅ Создание транзакций
- ✅ Telegram уведомления
- ✅ Google Sheets синхронизация (TODO)
- ✅ Email отчёты (TODO)

**Преимущества:**
- 🌐 Работает онлайн - не нужен сервер
- 🎨 Визуальный редактор
- ⚡ Быстрая настройка (5 минут)
- 🔄 24/7 uptime
- 🎁 Бесплатный тариф (20,000 executions/месяц)

**Начать:** Читай [GETTING-STARTED.md](./n8n-cloud/GETTING-STARTED.md)

---

## 🚀 Быстрый старт (5 минут)

```bash
# 1. Зарегистрируйся
https://n8n.io/cloud

# 2. Получи API ключ
Finappka → Settings → API Keys → Create

# 3. Импортируй workflow
n8n Cloud → Import → /integrations/n8n-cloud/workflows/get-transactions.json

# 4. Настрой credentials
Settings → Credentials → HTTP Header Auth

# 5. Тестируй!
Execute Node
```

---

## 📖 Дополнительные ресурсы

### Документация Finappka API:

**Local:**
```
http://localhost:3000/api/docs
```

**Production:**
```
https://твой-домен.com/api/docs
```

### Внешние ссылки:

- **n8n Cloud:** https://n8n.io/cloud
- **n8n Documentation:** https://docs.n8n.io
- **n8n Community:** https://community.n8n.io
- **n8n GitHub:** https://github.com/n8n-io/n8n

---

## 🔮 Будущие интеграции

**В планах:**

- **Zapier** - альтернатива n8n
- **Make (Integromat)** - визуальная автоматизация
- **IFTTT** - простые автоматизации
- **Webhooks API** - прямые webhooks из Finappka
- **REST API SDK** - библиотеки для разных языков (JavaScript, Python, Go, PHP)

---

## 🤝 Contributing

Хочешь добавить свою интеграцию?

1. Fork репозиторий
2. Создай папку в `/integrations/твоя-интеграция/`
3. Добавь документацию
4. Создай Pull Request

**Будем рады любому вкладу!** 🎉

---

## 📄 Лицензия

MIT License - свободное использование

---

## ❓ FAQ

### Нужно ли платить за n8n Cloud?

Есть бесплатный тариф (20,000 executions/месяц). Этого хватает для большинства пользователей.

### Где хранятся данные в n8n Cloud?

В облаке n8n (AWS). Они не имеют доступа к твоему Finappka API без ключа.

### Безопасно ли?

Да, если соблюдать правила безопасности:

- Используй HTTPS
- Храни API ключи в секрете
- Используй сильные пароли
- Включи 2FA в n8n

### Можно ли сделать свою интеграцию?

Конечно! Finappka имеет полный REST API. Используй любой язык/платформу.

---

**Happy integrating! 🚀**

*Последнее обновление: 23 октября 2024*
