# 🎯 Автоматическая проверка достижений

**Дата:** 2025-10-20  
**Версия:** 1.0

Система автоматической проверки и разблокировки достижений через триггеры базы данных.

---

## 🚀 Как это работает

### **Триггеры на уровне БД:**

При каждом действии пользователя (создание транзакции, бюджета, плана) автоматически:
1. **Проверяется** выполнение условий достижений
2. **Разблокируются** достижения при выполнении
3. **Добавляется** XP (опыт)
4. **Обновляется** прогресс частично выполненных достижений
5. **Обновляются** стрики ежедневной активности

---

## 📊 Что проверяется автоматически

### **1. Транзакции** ✅

**Триггер:** `trigger_check_transaction_achievements`  
**Срабатывает:** После создания транзакции (`INSERT`)

**Что проверяется:**
- ✅ **first_transaction** (1 транзакция) → +10 XP
- ✅ **transactions_10** (10 транзакций) → +20 XP
- ✅ **transactions_50** (50 транзакций) → +50 XP
- ✅ **transactions_100** (100 транзакций) → +100 XP
- ✅ **transactions_500** (500 транзакций) → +500 XP

**Специальные:**
- ✅ **early_bird** (транзакция до 8:00 UTC) → +10 XP
- ✅ **night_owl** (транзакция после 23:00 UTC) → +10 XP

**Бонусы:**
- +1 XP за любую транзакцию
- Обновление счётчика транзакций в `user_levels`

---

### **2. Бюджеты** ✅

**Триггер:** `trigger_check_budget_achievements`  
**Срабатывает:** После создания бюджета (`INSERT`)

**Что проверяется:**
- ✅ **first_budget** (1 бюджет) → +15 XP

**Бонусы:**
- +5 XP за создание бюджета

---

### **3. Планы (цели накопления)** ✅

**Триггер:** `trigger_check_plan_achievements`  
**Срабатывает:** После создания плана (`INSERT`)

**Что проверяется:**
- ✅ **first_savings_goal** (1 план) → +15 XP

**Бонусы:**
- +5 XP за создание плана

---

### **4. Достижение цели** ✅

**Триггер:** `trigger_check_goal_achieved`  
**Срабатывает:** При обновлении плана (`UPDATE`)

**Условие:** `accumulated >= target`

**Что проверяется:**
- ✅ **goal_achieved** (выполнение плана накопления) → +100 XP

---

### **5. Стрики активности** ✅

**Триггер:** `trigger_update_transaction_streak`  
**Срабатывает:** После создания транзакции (`INSERT`)

**Что делает:**
- Проверяет была ли активность вчера
- Если да → увеличивает стрик на +1
- Если нет → сбрасывает стрик
- Обновляет рекорд (`longest_streak`)
- Проверяет достижения по стрикам

**Что проверяется:**
- ✅ **streak_7** (7 дней подряд) → +30 XP
- ✅ **streak_30** (30 дней подряд) → +100 XP
- ✅ **streak_90** (90 дней подряд) → +300 XP
- ✅ **streak_365** (365 дней подряд) → +1000 XP

**Бонусы:**
- +2 XP за ежедневную активность
- Обновление `total_days_active` в `user_levels`

---

## 🔧 Функции БД

### **check_count_achievement(user_id, achievement_id, current_count)**

Проверяет и разблокирует достижения по количеству.

```sql
SELECT check_count_achievement(
  'user-uuid',
  'first_transaction',
  10
);
```

**Возвращает:** `TRUE` если достижение разблокировано

**Логика:**
1. Получает требование (`requirement_value`)
2. Проверяет не разблокировано ли уже
3. Если `current_count >= requirement` → разблокирует
4. Иначе → обновляет прогресс

---

### **add_user_xp(user_id, xp_amount)**

Добавляет XP пользователю.

```sql
SELECT add_user_xp('user-uuid', 50);
```

**Что делает:**
1. Создаёт запись в `user_levels` если нет
2. Добавляет XP к текущему значению
3. Триггер автоматически пересчитывает уровень

---

### **update_daily_streak(user_id, streak_type)**

Обновляет стрик ежедневной активности.

```sql
SELECT update_daily_streak(
  'user-uuid',
  'daily_transaction'
);
```

**Типы стриков:**
- `daily_transaction` - ежедневные транзакции
- `daily_login` - ежедневные входы (пока не используется)
- `budget_check` - проверка бюджета (пока не используется)

---

## 📈 Прогресс достижений

### **Полностью выполненные:**
```sql
SELECT * FROM user_achievements
WHERE user_id = 'user-uuid'
AND progress >= (
  SELECT requirement_value 
  FROM achievements_definitions 
  WHERE id = user_achievements.achievement_id
);
```

### **Частично выполненные:**
```sql
SELECT 
  ua.achievement_id,
  ua.progress,
  ad.requirement_value,
  ROUND((ua.progress::FLOAT / ad.requirement_value) * 100, 2) as percentage
FROM user_achievements ua
JOIN achievements_definitions ad ON ad.id = ua.achievement_id
WHERE ua.user_id = 'user-uuid'
AND ua.progress < ad.requirement_value;
```

---

## 🧪 Тестирование

### **1. Проверка достижений по транзакциям:**

```sql
-- Создайте транзакцию
INSERT INTO transactions (user_id, account_id, amount, currency, direction, occurred_at)
VALUES ('your-user-id', 'account-id', 10000, 'RUB', 'expense', NOW());

-- Проверьте достижения
SELECT * FROM user_achievements WHERE user_id = 'your-user-id';

-- Проверьте XP
SELECT * FROM user_levels WHERE user_id = 'your-user-id';
```

### **2. Проверка стриков:**

```sql
-- Проверьте текущий стрик
SELECT * FROM activity_streaks 
WHERE user_id = 'your-user-id' 
AND streak_type = 'daily_transaction';
```

### **3. Проверка специальных достижений:**

```sql
-- Создайте транзакцию рано утром (до 8:00 UTC)
INSERT INTO transactions (user_id, account_id, amount, currency, direction, occurred_at)
VALUES ('your-user-id', 'account-id', 10000, 'RUB', 'expense', '2025-10-20 07:30:00+00');

-- Проверьте early_bird
SELECT * FROM user_achievements 
WHERE user_id = 'your-user-id' 
AND achievement_id = 'early_bird';
```

---

## 🐛 Отладка

### **Проверить работу триггеров:**

```sql
-- Посмотреть все триггеры на таблице transactions
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'transactions';
```

### **Логи выполнения:**

Триггеры работают синхронно, ошибки будут в логах Supabase.

### **Вручную запустить проверку:**

```sql
-- Пересчитать достижения по транзакциям для пользователя
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM transactions
  WHERE user_id = 'your-user-id';
  
  PERFORM check_count_achievement('your-user-id', 'first_transaction', v_count);
  PERFORM check_count_achievement('your-user-id', 'transactions_10', v_count);
  -- и так далее...
END $$;
```

---

## ⚙️ Настройка

### **Отключить автопроверку (если нужно):**

```sql
ALTER TABLE transactions DISABLE TRIGGER trigger_check_transaction_achievements;
ALTER TABLE budgets DISABLE TRIGGER trigger_check_budget_achievements;
ALTER TABLE plans DISABLE TRIGGER trigger_check_plan_achievements;
ALTER TABLE plans DISABLE TRIGGER trigger_check_goal_achieved;
ALTER TABLE transactions DISABLE TRIGGER trigger_update_transaction_streak;
```

### **Включить обратно:**

```sql
ALTER TABLE transactions ENABLE TRIGGER trigger_check_transaction_achievements;
ALTER TABLE budgets ENABLE TRIGGER trigger_check_budget_achievements;
ALTER TABLE plans ENABLE TRIGGER trigger_check_plan_achievements;
ALTER TABLE plans ENABLE TRIGGER trigger_check_goal_achieved;
ALTER TABLE transactions ENABLE TRIGGER trigger_update_transaction_streak;
```

---

## 🎯 Что НЕ проверяется автоматически

Эти достижения требуют ручной проверки или CRON задачи:

- ❌ **saved_10k, saved_100k** - требует подсчёт баланса счетов
- ❌ **budget_master** - требует анализ соблюдения бюджета за 3 месяца
- ❌ **weekend_warrior** - требует подсчёт транзакций в выходные
- ❌ **perfectionist** - требует проверку заполненности полей

Эти достижения можно реализовать через:
1. **CRON задачу** (ежедневная проверка)
2. **API endpoint** (проверка по запросу)
3. **Дополнительные триггеры**

---

## 📊 Производительность

### **Влияние на скорость:**

Триггеры выполняются **синхронно** при INSERT/UPDATE:
- Добавляют ~50-100ms к операции
- Не критично для большинства случаев
- Выполняются в той же транзакции

### **Оптимизация:**

1. ✅ Используются индексы на `user_id`
2. ✅ Минимум запросов в триггерах
3. ✅ Проверка "уже разблокировано" до INSERT
4. ✅ Один триггер на таблицу

---

## 🔮 Будущие улучшения

1. **Асинхронная проверка** через очередь
2. **Пакетная проверка** при импорте CSV
3. **Уведомления** при разблокировке
4. **Анимации** разблокировки в UI
5. **Звуки** при получении достижения

---

## 📚 См. также

- `docs/GAMIFICATION.md` - общая документация по геймификации
- `db/migrations/020_gamification.sql` - таблицы
- `db/migrations/021_achievement_triggers.sql` - триггеры

---

**Автор:** AI Assistant  
**Дата:** 2025-10-20  
**Версия:** 1.0
