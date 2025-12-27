# План: Разделение подписок на пользовательские (Финансы) и организационные (Тендеры)

## Цель
Реализовать логику, при которой:
- **Режим "Финансы"** привязан к индивидуальному пользователю (user_id)
- **Режим "Тендеры"** привязан к организации (organization_id)
- SuperAdmin управляет обоими типами подписок

## Текущая структура

### Таблицы
- `profiles` - содержит `allowed_apps` (массив приложений для пользователя)
- `organizations` - содержит `allowed_modes` (массив режимов для организации)
- `organization_subscriptions` - подписки организаций
- `subscription_plans` - тарифные планы

### Данные
- **corvetik1@yandex.ru** (id: d4c7792d-b728-44ab-8b3b-aa44800685ba):
  - global_role: super_admin
  - allowed_apps: ["tenders", "investments", "finance"]
  
- **Организации**:
  - "Личное пространство" (id: 40113dc4-c927-4c8d-9507-a41d29595dd6): allowed_modes: ["finance", "tenders", "investments", "personal", "ai_studio"]
  - "Ромашка" (id: 81e6cf46-db78-4af7-bd45-662e7c4ed79e): allowed_modes: ["tenders"]
  - "Лютик" (id: 52b7b75d-01f9-4970-95a3-35ac207acd7a): allowed_modes: ["ai_studio"]

## План изменений

### Этап 1: Создание таблицы user_subscriptions
```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  mode TEXT NOT NULL DEFAULT 'finance', -- режим подписки (finance, investments, etc.)
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  amount BIGINT NOT NULL DEFAULT 0, -- стоимость в копейках
  discount_percent INTEGER DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, mode) -- один пользователь = одна подписка на режим
);

-- RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Политики: super_admin видит всё, пользователь видит свои
CREATE POLICY "Super admin full access" ON user_subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role = 'super_admin')
  );

CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT USING (user_id = auth.uid());
```

### Этап 2: Создание таблицы user_subscription_plans (тарифы для пользователей)
```sql
CREATE TABLE user_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  mode TEXT NOT NULL DEFAULT 'finance', -- для какого режима
  price_monthly BIGINT NOT NULL DEFAULT 0,
  price_yearly BIGINT NOT NULL DEFAULT 0,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Этап 3: Обновление логики проверки доступа

#### Файл: `lib/auth/check-access.ts` (или аналог)
```typescript
// Для режима "Финансы" - проверяем user_subscriptions
// Для режима "Тендеры" - проверяем organization_subscriptions

async function hasAccessToMode(userId: string, mode: string): Promise<boolean> {
  if (mode === 'finance' || mode === 'investments') {
    // Личные режимы - проверяем подписку пользователя
    const { data } = await supabase
      .from('user_subscriptions')
      .select('status')
      .eq('user_id', userId)
      .eq('mode', mode)
      .eq('status', 'active')
      .single();
    return !!data;
  } else {
    // Организационные режимы - проверяем через организацию
    // ... существующая логика
  }
}
```

### Этап 4: Обновление SuperAdmin панели

#### Новая страница: `/superadmin/user-subscriptions`
- Список всех пользовательских подписок
- Фильтры по режиму, статусу
- Возможность добавить/редактировать/отменить подписку

#### Обновить sidebar:
- Добавить пункт "Подписки пользователей" рядом с "Подписки организаций"

### Этап 5: Миграция данных

1. Для пользователя corvetik1@yandex.ru:
   - Создать запись в user_subscriptions с mode='finance', status='active'
   - Убрать 'finance' из organizations.allowed_modes для "Личное пространство" (оставить только tenders)

2. Для других пользователей с режимом finance:
   - Проанализировать и мигрировать аналогично

### Этап 6: Обновление UI переключения режимов

В header приложения логика выбора режима должна:
- Для "Финансы" - проверять user_subscriptions
- Для "Тендеры" - проверять organization_subscriptions

## Файлы для изменения

1. **Новые файлы:**
   - `db/migrations/20251227_user_subscriptions.sql`
   - `app/(protected)/superadmin/user-subscriptions/page.tsx`
   - `lib/billing/user-subscription-service.ts`
   - `types/user-billing.ts`

2. **Изменить:**
   - `components/superadmin/superadmin-sidebar.tsx` - добавить пункт меню
   - `lib/billing/subscription-service.ts` - добавить функции для user subscriptions
   - `app/(protected)/superadmin/page.tsx` - добавить статистику по user subscriptions
   - Логика проверки доступа к режимам

## Порядок выполнения

1. [x] Анализ текущей структуры
2. [x] Создать миграцию для user_subscriptions и user_subscription_plans
3. [x] Применить миграцию
4. [x] Создать типы TypeScript (`types/user-billing.ts`)
5. [x] Создать сервис user-subscription-service.ts
6. [x] Создать страницу SuperAdmin для управления user subscriptions (`/superadmin/user-subscriptions`)
7. [x] Обновить sidebar SuperAdmin
8. [x] Обновить главную страницу SuperAdmin (статистика)
9. [x] Добавить полное управление подписками (отмена, продление, приостановка, удаление)
10. [x] Создать API routes для действий с подписками
11. [x] Добавить компонент отображения подписок в профиле пользователя
12. [x] Создать таблицу finance_roles с уровнями доступа
13. [x] Включить режим Финансы для demo@demo.ru через подписку
14. [x] Сделать бессрочную подписку супер-админа на Финансы (100% скидка, 365 дней)
15. [x] Тестирование через Playwright
16. [ ] Обновить логику проверки доступа к режимам (middleware) - опционально

## Выполненные работы (27.12.2024)

### Созданные файлы:
- `db/migrations/20251227_user_subscriptions.sql` - основная миграция
- `db/migrations/20251227_user_subscriptions_management.sql` - расширения для управления
- `types/user-billing.ts` - типы для подписок
- `lib/billing/user-subscription-service.ts` - сервис с функциями:
  - `getUserSubscriptionPlans`, `getUserSubscriptionPlan`
  - `getUserSubscriptions`, `getUserSubscription`
  - `createUserSubscription`, `updateUserSubscription`
  - `renewUserSubscription`, `suspendUserSubscription`
  - `resumeUserSubscription`, `deleteUserSubscription`
  - `cancelUserSubscription`
- `app/(protected)/superadmin/user-subscriptions/page.tsx` - страница списка
- `app/(protected)/superadmin/user-subscriptions/UserSubscriptionsTable.tsx` - таблица с действиями
- `app/(protected)/superadmin/user-subscriptions/AddUserSubscriptionModal.tsx` - модалка добавления
- `app/(protected)/superadmin/user-subscriptions/EditUserSubscriptionModal.tsx` - модалка редактирования
- `app/api/superadmin/user-subscriptions/[id]/actions/route.ts` - API для действий
- `components/settings/UserSubscriptionsCard.tsx` - карточка подписок в профиле

### Таблицы в БД:
- `user_subscriptions` - подписки пользователей
- `user_subscription_plans` - тарифные планы (Бесплатный, Стандарт, Премиум)
- `user_subscription_payments` - платежи
- `user_subscription_history` - история изменений
- `finance_roles` - роли для режима Финансы (free, standard, premium)

### Функционал SuperAdmin:
- Просмотр всех пользовательских подписок
- Добавление новых подписок
- Редактирование подписок
- Продление, приостановка, возобновление
- Отмена и удаление подписок
- Фильтрация и поиск
- Статистика MRR и распределение по тарифам

## Результаты тестирования (28.12.2024)

### Протестировано через Playwright:
1. ✅ **SuperAdmin панель** (`/superadmin/user-subscriptions`):
   - Отображение списка подписок с фильтрацией и поиском
   - Статистика MRR, активных/пробных/истекших подписок
   - Распределение по тарифам

2. ✅ **Подписка demo@demo.ru**:
   - Тариф: Стандарт
   - Статус: Активна
   - Сумма: 299 ₽/мес
   - Доступ к режиму Финансы работает

3. ✅ **Подписка супер-админа (corvetik1@yandex.ru)**:
   - Тариф: Премиум
   - Статус: Активна
   - Скидка: 100% (бесплатно)
   - Срок: 365 дней

4. ✅ **Профиль пользователя**:
   - Раздел "Мои подписки" отображается
   - Показывает тариф, статус, дату истечения, стоимость

## Примечания

- Super Admin (corvetik1@yandex.ru) имеет бессрочную подписку на Финансы с 100% скидкой
- Режим "Финансы" - индивидуальная подписка пользователя (user_subscriptions)
- Режим "Тендеры" - подписка организации (organization_subscriptions)
- Бесплатный тариф с ограничениями, платные - полный функционал
- Роли finance_roles определяют уровень доступа внутри режима Финансы
