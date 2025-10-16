# Настройка умных уведомлений с Telegram

## Обзор

Система умных уведомлений позволяет:
- ✅ Выбирать типы уведомлений (превышение трат, бюджеты, платежи, активность)
- ⏰ Настраивать конкретное время отправки
- 📅 Выбирать дни недели
- 🔕 Устанавливать тихие часы
- 📱 Получать уведомления в Telegram бот

## Шаг 1: Применить миграцию БД

```bash
# Подключитесь к Supabase и примените миграцию
psql $DATABASE_URL -f db/migrations/20251016_notification_schedule_telegram.sql
```

Или через Supabase Dashboard:
1. Откройте SQL Editor
2. Скопируйте содержимое `db/migrations/20251016_notification_schedule_telegram.sql`
3. Выполните

## Шаг 2: Настроить переменные окружения

Убедитесь, что у вас есть:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token

# CRON Secret (для защиты endpoint)
CRON_SECRET=your_random_secret_string
```

## Шаг 3: Заменить страницу настроек

```bash
# Переименуйте файлы
mv app/(protected)/settings/notifications/page.tsx app/(protected)/settings/notifications/page-old.tsx
mv app/(protected)/settings/notifications/page-new.tsx app/(protected)/settings/notifications/page.tsx
```

## Шаг 4: Настроить CRON в Vercel

1. Перейдите в Vercel Dashboard → ваш проект → Settings → Cron Jobs
2. Добавьте новый Cron:
   - **Path:** `/api/cron/smart-notifications`
   - **Schedule:** `0 */1 * * *` (каждый час)
   - **Headers:** `Authorization: Bearer YOUR_CRON_SECRET`

## Использование

### Для пользователя:

1. **Привязка Telegram** (если еще не сделано):
   - Перейдите в `/settings/telegram`
   - Сгенерируйте код привязки
   - Отправьте боту: `/start ВАШ_КОД`

2. **Настройка уведомлений**:
   - Откройте `/settings/notifications`
   - Включите нужные типы уведомлений
   - Выберите время (например, 09:00)
   - Выберите дни недели (например, пн-пт)
   - Включите "Отправлять в Telegram"
   - Нажмите "Сохранить"

3. **Тихие часы** (опционально):
   - Установите начало (например, 22:00)
   - Установите конец (например, 08:00)
   - Уведомления не будут отправляться в это время

### Как это работает:

1. **CRON запускается каждый час**
2. **Проверяет расписание каждого пользователя**:
   - Совпадает ли текущий день с выбранными днями?
   - Находится ли текущее время в пределах ±30 минут от schedule_time?
   - Не попадает ли в тихие часы?
3. **Для подходящих пользователей**:
   - Запускает все 4 детектора (траты, активность, платежи, бюджеты)
   - Фильтрует по включённым типам
   - Формирует красивое сообщение
   - Отправляет в Telegram

## Пример уведомления в Telegram

```
🔔 Уведомления (3)

🚨 Превышение трат
Ваши траты на "Продукты" на 45% выше обычного

⚠️ Внимание: бюджет
Бюджет "Развлечения" на 85% (17000₽ из 20000₽)

ℹ️ Предстоящий платёж
Платёж "Интернет" через 2 дня - 800₽

Отправлено: 16.10.2025, 09:00
```

## Типы уведомлений

| Тип | Описание | Детектор |
|-----|----------|----------|
| **Превышение трат** | Аномальные траты, крупные покупки, высокая частота | `spending-detector.ts` |
| **Бюджетные предупреждения** | 50%, 80%, 100%, 120% от лимита | `budget-detector.ts` |
| **Напоминания о транзакциях** | Пропущенные дни, низкая активность | `activity-detector.ts` |
| **Предстоящие платежи** | Просрочки, сегодня, завтра, через 2-3 дня | `payment-detector.ts` |

## Структура базы данных

### Таблица `notification_preferences`

```sql
-- Основные типы уведомлений
overspend_alerts BOOLEAN DEFAULT TRUE
budget_warnings BOOLEAN DEFAULT TRUE
missing_transaction_reminders BOOLEAN DEFAULT FALSE
upcoming_payment_reminders BOOLEAN DEFAULT TRUE
ai_insights BOOLEAN DEFAULT TRUE
ai_recommendations BOOLEAN DEFAULT TRUE

-- Расписание
schedule_enabled BOOLEAN DEFAULT TRUE
schedule_time TIME DEFAULT '09:00:00'
schedule_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7]
quiet_hours_start TIME DEFAULT '22:00:00'
quiet_hours_end TIME DEFAULT '08:00:00'

-- Telegram
telegram_enabled BOOLEAN DEFAULT FALSE
telegram_chat_id BIGINT
telegram_user_id TEXT
telegram_username TEXT
```

## API Endpoints

### GET `/api/settings/notifications`
Получить настройки текущего пользователя

**Response:**
```json
{
  "overspend_alerts": true,
  "budget_warnings": true,
  "schedule_enabled": true,
  "schedule_time": "09:00:00",
  "schedule_days": [1, 2, 3, 4, 5],
  "telegram_enabled": true,
  "telegram_chat_id": 123456789
}
```

### PATCH `/api/settings/notifications`
Обновить настройки

**Request:**
```json
{
  "schedule_time": "10:00:00",
  "schedule_days": [1, 2, 3, 4, 5, 6, 7],
  "telegram_enabled": true
}
```

### GET `/api/cron/smart-notifications`
CRON endpoint для генерации и отправки уведомлений

**Headers:**
```
Authorization: Bearer YOUR_CRON_SECRET
```

**Response:**
```json
{
  "success": true,
  "results": {
    "processed": 42,
    "total_alerts": 85,
    "sent": 85,
    "failed": 0,
    "errors": 0
  },
  "timestamp": "2025-10-16T09:00:00.000Z"
}
```

## Отладка

### Проверка настроек пользователя:
```sql
SELECT * FROM notification_preferences WHERE user_id = 'YOUR_USER_ID';
```

### Ручной запуск CRON (для тестирования):
```bash
curl -X GET https://yourapp.vercel.app/api/cron/smart-notifications \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Проверка логов:
- Vercel Dashboard → Functions → Logs
- Фильтр по `/api/cron/smart-notifications`

### Тестирование Telegram отправки:
1. Убедитесь, что `telegram_chat_id` заполнен
2. Включите `telegram_enabled`
3. Запустите CRON вручную
4. Проверьте Telegram бот

## Troubleshooting

**Уведомления не приходят:**
- ✅ Проверьте `schedule_enabled = true`
- ✅ Проверьте, что текущий день в `schedule_days`
- ✅ Проверьте `schedule_time` (±30 минут)
- ✅ Проверьте тихие часы
- ✅ Проверьте `telegram_enabled = true`
- ✅ Проверьте `telegram_chat_id` не null

**CRON не запускается:**
- ✅ Проверьте настройки Vercel Cron Jobs
- ✅ Проверьте `CRON_SECRET` в переменных окружения
- ✅ Проверьте логи Vercel

**Telegram не отправляет:**
- ✅ Проверьте `TELEGRAM_BOT_TOKEN`
- ✅ Проверьте, что бот запущен (`/start`)
- ✅ Проверьте `telegram_chat_id` в БД

## Файлы проекта

```
db/migrations/
  └── 20251016_notification_schedule_telegram.sql  # Миграция БД

app/api/
  ├── settings/notifications/route.ts              # API настроек
  └── cron/smart-notifications/route.ts            # CRON endpoint

app/(protected)/settings/notifications/
  ├── page.tsx                                     # UI настроек (новый)
  └── NotificationSettings.module.css              # Стили

lib/notifications/
  ├── notification-manager.ts                      # Менеджер + Telegram
  ├── spending-detector.ts                         # Детектор трат
  ├── activity-detector.ts                         # Детектор активности
  ├── payment-detector.ts                          # Детектор платежей
  └── budget-detector.ts                           # Детектор бюджетов

lib/telegram/
  └── bot.ts                                       # Telegram API
```

## Дальнейшие улучшения

- [ ] Email уведомления (в дополнение к Telegram)
- [ ] Push notifications через WebPush API
- [ ] Персонализация частоты по типам уведомлений
- [ ] История уведомлений в приложении
- [ ] A/B тестирование времени отправки
- [ ] Умная оптимизация расписания на основе активности пользователя

---

**Готово!** 🎉 Теперь пользователи могут настраивать уведомления и получать их в Telegram в удобное время!
