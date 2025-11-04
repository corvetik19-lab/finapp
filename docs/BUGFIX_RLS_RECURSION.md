# 🐛 Исправление: Бесконечная рекурсия в RLS политиках

## Проблема

```
Error: {"code":"42P17","message":"infinite recursion detected in policy for relation \"organization_members\""}
```

### Причина

RLS политика для таблицы `organization_members` ссылалась на саму себя:

```sql
-- ПРОБЛЕМНАЯ ПОЛИТИКА
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (
    org_id IN (
      SELECT organizations.id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_members_1.org_id  -- ❌ Рекурсия!
      FROM organization_members organization_members_1
      WHERE user_id = auth.uid()
    )
  );
```

Политика пыталась проверить `organization_members`, чтобы определить доступ к `organization_members` → бесконечная рекурсия.

## Решение

### 1. Упрощённые RLS политики без рекурсии

```sql
-- ✅ ИСПРАВЛЕННАЯ ПОЛИТИКА
CREATE POLICY "Members can view their organization members"
  ON organization_members FOR SELECT
  USING (
    user_id = auth.uid()  -- Пользователь видит свою запись
    OR 
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = organization_members.org_id 
      AND organizations.owner_id = auth.uid()  -- Владелец видит всех
    )
  );

CREATE POLICY "Owners can manage organization members"
  ON organization_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizations 
      WHERE organizations.id = organization_members.org_id 
      AND organizations.owner_id = auth.uid()
    )
  );
```

**Ключевые изменения:**
- Убрали подзапрос к `organization_members` внутри политики
- Используем только `organizations.owner_id` для проверки прав
- Добавили `user_id = auth.uid()` для просмотра своей записи

### 2. SECURITY DEFINER для helper функций

Функции-помощники теперь выполняются с правами владельца (обходят RLS):

```sql
CREATE OR REPLACE FUNCTION get_user_current_org()
RETURNS UUID 
SECURITY DEFINER  -- ✅ Обходит RLS
SET search_path = public
LANGUAGE SQL STABLE
AS $$
  SELECT org_id 
  FROM organization_members 
  WHERE user_id = auth.uid() 
  ORDER BY created_at ASC 
  LIMIT 1;
$$;
```

Это безопасно, так как функция всё равно проверяет `user_id = auth.uid()`.

### 3. Замена `<img>` на `next/image`

Исправлены предупреждения ESLint:

```typescript
// ❌ Было
<img src={user.avatar_url} alt={user.full_name} />

// ✅ Стало
<Image 
  src={user.avatar_url} 
  alt={user.full_name} 
  width={32}
  height={32}
/>
```

## Применённые миграции

1. **fix_organization_members_rls_recursion** - исправление RLS политик
2. **fix_helper_functions_security** - добавление SECURITY DEFINER

## Проверка

```sql
-- Проверить политики
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'organization_members';

-- Проверить функции
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname LIKE '%org%';
```

## Результат

✅ Бесконечная рекурсия устранена  
✅ RLS политики работают корректно  
✅ Helper функции используют SECURITY DEFINER  
✅ ESLint warnings исправлены  

## Тестирование

```typescript
// Проверить доступ к организациям
const org = await getCurrentOrganization();
console.log(org); // Должно работать без ошибок

// Проверить роль
const role = await getUserRole(orgId);
console.log(role); // owner/admin/member/viewer
```

## Уроки

1. **Избегайте рекурсии в RLS** - политика не должна ссылаться на свою таблицу
2. **Используйте SECURITY DEFINER осторожно** - только для безопасных функций
3. **Тестируйте RLS локально** - проверяйте политики перед деплоем
4. **Логируйте ошибки** - код 42P17 = infinite recursion

---

**Статус:** ✅ Исправлено  
**Дата:** 4 ноября 2025  
**Версия:** 1.0.1
