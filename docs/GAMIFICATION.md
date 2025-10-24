# 🎮 Геймификация - Достижения и Стрики

Система мотивации пользователей через достижения, уровни и ежедневные стрики.

## 🏆 Возможности

### ✅ **Реализовано:**

1. **Система достижений** - 20+ достижений разных категорий
2. **Уровни и опыт (XP)** - прогрессия пользователя
3. **Стрики активности** - ежедневные цепочки
4. **Бейджи и награды** - 4 тира (бронза, серебро, золото, платина)
5. **Страница достижений** - красивый UI с прогрессом

---

## 🎯 Категории достижений

### 📝 **Транзакции:**
- Первый шаг (1 транзакция)
- Новичок (10 транзакций)
- Активный (50 транзакций)
- Мастер учёта (100 транзакций)
- Легенда (500 транзакций)

### 💰 **Накопления:**
- Цель поставлена (первая цель)
- Мечта сбылась (достижение цели)
- Первая 10K (накопить 10 000 ₽)
- Мастер накоплений (накопить 100 000 ₽)

### 🔥 **Стрики:**
- Неделя активности (7 дней подряд)
- Месяц активности (30 дней)
- Квартал активности (90 дней)
- Год активности (365 дней)

### 💼 **Бюджеты:**
- Первый бюджет
- Мастер бюджетов (соблюдать 3 месяца)

### ⭐ **Специальные:**
- Ранняя пташка (транзакция до 8:00)
- Полуночник (транзакция после 23:00)
- Выходной воин (10 транзакций в выходные)
- Перфекционист (50 полных транзакций)

---

## 📊 Система уровней

### **Формула расчёта:**
```
level = floor(sqrt(xp / 100)) + 1
```

### **Примеры:**
- 0-99 XP → Уровень 1
- 100-399 XP → Уровень 2
- 400-899 XP → Уровень 3
- 900-1599 XP → Уровень 4
- 1600-2499 XP → Уровень 5

### **Как заработать XP:**
- Разблокировать достижение → +10-1000 XP (зависит от тира)
- Добавить транзакцию → +1 XP
- Соблюсти бюджет → +5 XP
- Ежедневная активность → +2 XP

---

## 🎖️ Тиры достижений

| Тир | Цвет | Награда XP | Сложность |
|-----|------|------------|-----------|
| 🥉 Бронза | #cd7f32 | 10-30 XP | Легко |
| 🥈 Серебро | #c0c0c0 | 50-100 XP | Средне |
| 🥇 Золото | #ffd700 | 100-300 XP | Сложно |
| 💎 Платина | #e5e4e2 | 500-1000 XP | Очень сложно |

---

## 🚀 Использование

### **Просмотр достижений:**

1. Откройте страницу `/achievements`
2. Просмотрите все доступные достижения
3. Фильтруйте по категориям
4. Следите за прогрессом

### **API Endpoints:**

```typescript
// Получить все достижения с прогрессом
GET /api/gamification/achievements
Response: { achievements: AchievementWithProgress[] }

// Получить уровень пользователя
GET /api/gamification/level
Response: { 
  level: UserLevel,
  progress: { current, next, percentage }
}

// Получить стрики
GET /api/gamification/streaks
Response: { streaks: ActivityStreak[] }
```

---

## 📋 Структура БД

### **Таблицы:**

```sql
achievements_definitions  -- Определения всех достижений
user_achievements        -- Разблокированные достижения
activity_streaks         -- Стрики пользователя
user_levels              -- Уровни и XP
```

### **Пример добавления достижения:**

```sql
INSERT INTO achievements_definitions (
  id, name, description, icon, category, tier, points,
  requirement_type, requirement_value
) VALUES (
  'my_achievement',
  'Мое достижение',
  'Описание',
  '🎯',
  'special',
  'gold',
  150,
  'count',
  100
);
```

---

## 💻 Программное использование

### **Разблокировать достижение:**

```typescript
import { createRSCClient } from '@/lib/supabase/server';

const supabase = await createRSCClient();
const { data: { user } } = await supabase.auth.getUser();

// Проверяем условие
if (transactionCount >= 10) {
  // Разблокируем достижение
  await supabase.from('user_achievements').insert({
    user_id: user.id,
    achievement_id: 'transactions_10',
    progress: transactionCount,
  });
  
  // Добавляем XP
  await supabase.rpc('add_experience', {
    user_id: user.id,
    xp: 20,
  });
}
```

### **Обновить стрик:**

```typescript
const today = new Date().toISOString().split('T')[0];

await supabase.from('activity_streaks').upsert({
  user_id: user.id,
  streak_type: 'daily_transaction',
  last_activity_date: today,
  current_streak: 5,
  longest_streak: 10,
}, {
  onConflict: 'user_id,streak_type',
});
```

---

## 🎨 Кастомизация

### **Добавить новое достижение:**

1. Добавьте запись в `achievements_definitions`
2. Добавьте логику проверки в нужное место
3. Обновите типы TypeScript при необходимости

### **Изменить формулу уровня:**

Отредактируйте функцию в `db/migrations/020_gamification.sql`:

```sql
CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Ваша формула
  RETURN FLOOR(SQRT(xp / 50.0)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## 📊 Аналитика

### **Популярные достижения:**

```sql
SELECT 
  ad.name,
  COUNT(ua.id) as unlock_count
FROM achievements_definitions ad
LEFT JOIN user_achievements ua ON ua.achievement_id = ad.id
GROUP BY ad.id, ad.name
ORDER BY unlock_count DESC
LIMIT 10;
```

### **Средний уровень пользователей:**

```sql
SELECT 
  AVG(level) as avg_level,
  MAX(level) as max_level,
  AVG(experience_points) as avg_xp
FROM user_levels;
```

---

## 🔮 Будущие улучшения

Планируется добавить:

- 🏅 Сезонные достижения (ограниченные по времени)
- 🎁 Награды за достижения (темы, иконки)
- 🏆 Таблица лидеров
- 🎯 Челленджи с дедлайнами
- 📱 Push-уведомления о новых достижениях
- 🎉 Анимации разблокировки

---

## 🧪 Тестирование

### **Сброс прогресса (для тестов):**

```sql
-- Удалить все достижения пользователя
DELETE FROM user_achievements WHERE user_id = 'your-user-id';

-- Сбросить уровень
UPDATE user_levels 
SET level = 1, experience_points = 0 
WHERE user_id = 'your-user-id';

-- Сбросить стрики
DELETE FROM activity_streaks WHERE user_id = 'your-user-id';
```

---

**Версия:** v1.0  
**Дата:** 2025-10-19  
**Автор:** FinApp Team
