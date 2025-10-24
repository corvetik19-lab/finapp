# 📧 Настройка Email Уведомлений (Resend)

## 🎯 Что реализовано

Email уведомления отправляются автоматически при:
- **Превышении бюджета** (≥80% использовано)
- **Крупных транзакциях** (значительно больше среднего чека)
- **Еженедельной сводке** (опционально, через CRON)

---

## 📋 Шаг 1: Регистрация в Resend

1. Перейдите на https://resend.com
2. Создайте аккаунт (бесплатно)
3. Подтвердите email адрес

**Бесплатный план:**
- 100 emails/день
- 3,000 emails/месяц
- Отправка с вашего домена

---

## 🔑 Шаг 2: Получение API ключа

1. Откройте https://resend.com/api-keys
2. Нажмите **"Create API Key"**
3. Выберите:
   - **Name**: `finapp-production`
   - **Permission**: "Sending access"
   - **Domain**: (выберите свой домен или sandbox)
4. Скопируйте ключ (формат: `re_xxxxxxxxxxxxx`)

⚠️ **Важно:** Сохраните ключ сразу - больше его не покажут!

---

## 🌐 Шаг 3: Настройка домена (опционально)

Для отправки с вашего домена (например, `noreply@finapp.com`):

1. Откройте https://resend.com/domains
2. Нажмите **"Add Domain"**
3. Введите ваш домен (например, `finapp.com`)
4. Добавьте DNS записи в настройки домена:
   ```
   Type: TXT
   Name: resend._domainkey
   Value: [значение из Resend]
   ```
5. Дождитесь проверки (5-30 минут)

**Без домена:** можно использовать Resend sandbox:
- От адрес: `onboarding@resend.dev`
- Отправка только на ваш email

---

## ⚙️ Шаг 4: Настройка переменных окружения

### Локально (`.env.local`):

```bash
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxx

# От какого email отправлять (после настройки домена)
RESEND_FROM_EMAIL=Finapp <noreply@yourdomain.com>

# Или используйте sandbox для тестов
RESEND_FROM_EMAIL=Finapp <onboarding@resend.dev>

# URL вашего приложения (для ссылок в письмах)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### В Vercel (Production):

1. Откройте проект в Vercel Dashboard
2. Settings → Environment Variables
3. Добавьте переменные:
   - `RESEND_API_KEY` = ваш ключ
   - `RESEND_FROM_EMAIL` = ваш email
   - `NEXT_PUBLIC_APP_URL` = https://yourapp.vercel.app
4. Передеплойте приложение

---

## 🧪 Шаг 5: Тестирование

### Через API:

```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test"
  }'
```

### Через приложение:

1. Откройте `/forecasts` (Прогнозы)
2. Создайте транзакцию с превышением бюджета
3. Проверьте email в почте

---

## 📝 Доступные Email Шаблоны

### 1. Budget Alert (`BudgetAlert.tsx`)
Отправляется при превышении бюджета на 80%+

**Параметры:**
- `categoryName` - название категории
- `budgetLimit` - лимит бюджета (в копейках)
- `currentSpent` - текущие траты
- `percentage` - процент использования

**Пример:**
```typescript
await sendBudgetAlertEmail({
  to: "user@example.com",
  userName: "Иван",
  categoryName: "Продукты",
  budgetLimit: 1000000, // 10,000₽
  currentSpent: 850000,  // 8,500₽
  percentage: 85,
});
```

### 2. Large Transaction (`LargeTransactionAlert.tsx`)
Отправляется при крупной транзакции

**Параметры:**
- `amount` - сумма транзакции
- `categoryName` - категория
- `description` - описание
- `averageAmount` - средний чек

**Пример:**
```typescript
await sendLargeTransactionEmail({
  to: "user@example.com",
  userName: "Иван",
  amount: 1500000, // 15,000₽
  categoryName: "Покупки",
  description: "Новый телефон",
  date: "21.10.2025",
  averageAmount: 300000, // 3,000₽
});
```

### 3. Weekly Summary (`WeeklySummary.tsx`)
Еженедельный отчёт о финансах

**Параметры:**
- `weekStart/weekEnd` - даты периода
- `totalIncome/totalExpense` - доходы и расходы
- `topCategories` - топ-3 категории трат
- `transactionCount` - количество транзакций

---

## ⚙️ Настройки уведомлений

Пользователи могут управлять своими email уведомлениями на странице **`/settings/email`**.

### Доступные настройки:

- ✅ **Превышение бюджета** (вкл/выкл)
- ✅ **Крупные транзакции** (вкл/выкл)
- ✅ **Еженедельная сводка** (вкл/выкл)
  - День недели (Понедельник - Воскресенье)
  - Время отправки (00:00 - 23:59)
- ✅ **Альтернативный email** (опционально)

Настройки хранятся в таблице `user_email_preferences`.

---

## 🔄 Автоматическая отправка

### При превышении бюджета:

Email отправляется автоматически когда:
- API `/api/ai/anomaly-detector` обнаруживает критический алерт
- Вызывается при загрузке страницы `/forecasts`
- Проверяются настройки пользователя (`checkEmailPreferences`)
- Можно настроить CRON для ежедневной проверки

### Еженедельная сводка (CRON):

Создайте файл `app/api/cron/weekly-summary/route.ts`:

```typescript
import { sendWeeklySummaryEmail } from "@/lib/email/resend-service";

export async function GET(request: Request) {
  // Проверка CRON секрета
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Получить всех пользователей и отправить отчёты
  // ...
}
```

Настройка в `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/weekly-summary",
    "schedule": "0 9 * * 1"
  }]
}
```

---

## 🎨 Кастомизация Шаблонов

Шаблоны находятся в `lib/email/templates/`.

Чтобы изменить дизайн:

1. Откройте нужный шаблон (`.tsx`)
2. Измените стили (inline CSS в объектах `const`)
3. Сохраните и перезапустите dev сервер

**Компоненты React Email:**
- `<Html>` - корневой элемент
- `<Head>` - метаданные
- `<Preview>` - текст превью в почте
- `<Body>` - тело письма
- `<Container>` - контейнер контента
- `<Button>` - кнопка-ссылка
- `<Section>` - блок контента
- `<Hr>` - разделитель

**Документация:** https://react.email/docs/components/html

---

## 📊 Мониторинг

### Логи Resend:

1. Откройте https://resend.com/emails
2. Просмотрите:
   - Отправленные emails
   - Статусы доставки
   - Ошибки отправки
   - Открытия и клики (если включено)

### Логи приложения:

Email сервис логирует в консоль:
- ✅ `Budget alert email sent: <id>`
- ✅ `Large transaction email sent: <id>`
- ❌ `Failed to send budget alert email: <error>`

---

## ❓ Troubleshooting

### Письма не отправляются:

1. **Проверьте API ключ**:
   ```bash
   echo $RESEND_API_KEY
   # Должно вывести: re_xxxxx
   ```

2. **Проверьте from адрес**:
   - Если используете свой домен - настройте DNS
   - Иначе используйте `onboarding@resend.dev`

3. **Проверьте лимиты**:
   - Бесплатный план: 100/день
   - Проверьте дашборд Resend

### Письма попадают в спам:

1. Настройте SPF/DKIM записи домена
2. Используйте проверенный домен (не Gmail)
3. Избегайте спам-слов в теме/тексте
4. Добавьте ссылку отписки

### Ошибки TypeScript:

Если есть ошибки типов с `render()`:
```typescript
const emailHtml = (await render(Component({...}))) as unknown as string;
```

---

## 📚 Полезные ссылки

- **Resend Docs**: https://resend.com/docs
- **React Email**: https://react.email
- **API Reference**: https://resend.com/docs/api-reference
- **Примеры шаблонов**: https://react.email/examples

---

## ✅ Чеклист перед production:

- [ ] API ключ Resend создан
- [ ] Домен настроен и проверен
- [ ] DNS записи добавлены (SPF, DKIM)
- [ ] `RESEND_FROM_EMAIL` установлен
- [ ] Тестовое письмо отправлено успешно
- [ ] Лимиты плана достаточны
- [ ] Логирование работает
- [ ] Email не попадает в спам

**Готово к запуску! 🚀**
