# 🤖 Настройка Telegram Бота

## 1. Создание бота в Telegram

1. Найдите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Введите имя бота (например: "FinApp Bot")
4. Введите username (например: "finapp_tracker_bot")
5. Получите **BOT TOKEN** (формат: `1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ`)

## 2. Настройка переменных окружения

Добавьте в Vercel (Settings → Environment Variables):

```
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
```

## 3. Установка Webhook

После деплоя на Vercel, выполните один раз:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-app.vercel.app/api/telegram/webhook"}'
```

Замените:
- `<YOUR_BOT_TOKEN>` на ваш токен
- `your-app.vercel.app` на ваш домен Vercel

## 4. Привязка Telegram к аккаунту

### ✅ Через настройки приложения (Рекомендуется)
1. Войдите в FinApp
2. Перейдите в **Настройки → Telegram** (`/settings/telegram`)
3. Нажмите **"Сгенерировать код"**
4. Скопируйте полученный 6-значный код
5. Откройте бота в Telegram
6. Отправьте команду: `/start ВАШ_КОД`
7. Готово! ✅

**Код действует 10 минут!**

## 5. Доступные команды

После привязки вы можете использовать:

- `/start` - Приветствие и список команд
- `/help` - Справка
- `/balance` - Показать баланс
- `/stats` - Статистика за месяц
- `/budgets` - Состояние бюджетов
- `/add 500 кофе` - Добавить расход

**Естественные команды:**
- "Добавь 1000р на продукты"
- "Покажи баланс"
- "Сколько я потратил за месяц?"

## 6. Проверка работы

```bash
# Проверить webhook
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"

# Должен вернуть:
{
  "ok": true,
  "result": {
    "url": "https://your-app.vercel.app/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

## 7. Отладка

Логи webhook доступны в Vercel:
- Dashboard → Your Project → Functions → `/api/telegram/webhook`

## 8. Миграция базы данных

После деплоя выполните миграцию для таблицы кодов привязки:

```sql
-- Выполните в Supabase SQL Editor
-- Файл: db/migrations/20251012_telegram_link_codes.sql
```

Или через Supabase CLI:
```bash
supabase db push
```

## 9. Будущие улучшения

- [x] UI для привязки Telegram в настройках
- [x] Автоматическая привязка через код
- [ ] Отправка уведомлений о превышении бюджета
- [ ] Напоминания о платежах
- [ ] Еженедельная сводка
- [ ] Inline keyboard для быстрых действий
