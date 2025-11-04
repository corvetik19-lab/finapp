# 📋 Практическое руководство по миграции в мультимодальную платформу

## Что создано

✅ **Архитектурный план** - `docs/PLATFORM_ARCHITECTURE.md`  
✅ **Mode Registry** - `lib/platform/mode-registry.ts`  
✅ **Mode Switcher** - `components/platform/ModeSwitcher.tsx`  

## Следующие шаги

### 1️⃣ База данных и multi-tenancy (приоритет 1)

Создайте SQL миграцию для добавления организаций:

```bash
# Создайте файл миграции
touch db/migrations/001_add_organizations.sql
```

```sql
-- db/migrations/001_add_organizations.sql

-- Организации
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  subscription_plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Члены организации
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Настройки режимов
CREATE TABLE IF NOT EXISTS organization_mode_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  mode_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, mode_key)
);

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_mode_settings ENABLE ROW LEVEL SECURITY;

-- Политики для organizations
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid());

-- Политики для organization_members
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Миграция существующих данных
-- Создаём организацию для каждого пользователя
INSERT INTO organizations (name, slug, owner_id)
SELECT 
  COALESCE(full_name, email, 'Моя организация'),
  'org-' || id::text,
  id
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM organizations WHERE owner_id = auth.users.id
);

-- Добавляем каждого пользователя как члена своей организации
INSERT INTO organization_members (org_id, user_id, role)
SELECT o.id, o.owner_id, 'owner'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members 
  WHERE org_id = o.id AND user_id = o.owner_id
);
```

Примените миграцию в Supabase:

```bash
# Через Supabase Studio: SQL Editor → вставьте SQL выше → Run
```

### 2️⃣ Добавление org_id к существующим таблицам

```sql
-- db/migrations/002_add_org_id_to_tables.sql

-- Добавляем org_id к существующим таблицам
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- Обновляем данные: связываем с организацией пользователя
UPDATE transactions t
SET org_id = (
  SELECT o.id FROM organizations o WHERE o.owner_id = t.user_id LIMIT 1
)
WHERE org_id IS NULL;

UPDATE accounts a
SET org_id = (
  SELECT o.id FROM organizations o WHERE o.owner_id = a.user_id LIMIT 1
)
WHERE org_id IS NULL;

UPDATE categories c
SET org_id = (
  SELECT o.id FROM organizations o WHERE o.owner_id = c.user_id LIMIT 1
)
WHERE org_id IS NULL;

UPDATE budgets b
SET org_id = (
  SELECT o.id FROM organizations o WHERE o.owner_id = b.user_id LIMIT 1
)
WHERE org_id IS NULL;

-- Создаём индексы для производительности
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_accounts_org_id ON accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_categories_org_id ON categories(org_id);
CREATE INDEX IF NOT EXISTS idx_budgets_org_id ON budgets(org_id);

-- Обновляем RLS политики
ALTER POLICY "Users can view their own transactions" ON transactions
USING (
  org_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- Повторите для других таблиц...
```

### 3️⃣ Создание стилей для Platform компонентов

```css
/* components/platform/Platform.module.css */

.modeSwitcher {
  position: relative;
}

.modeSwitcherButton {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.modeSwitcherButton:hover {
  background: var(--surface-secondary);
  border-color: var(--border-hover);
}

.modeNamedesktop {
  font-weight: 500;
}

.modeSwitcherOverlay {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.modeSwitcherDropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 320px;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 50;
  overflow: hidden;
}

.modeSwitcherHeader {
  padding: 16px;
  border-bottom: 1px solid var(--border-primary);
}

.modeSwitcherHeader h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.modeSwitcherHeader p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.modeList {
  padding: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.modeItem {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.modeItem:hover:not(.modeItemActive) {
  background: var(--surface-hover);
}

.modeItemActive {
  background: var(--surface-active);
  cursor: default;
}

.modeItemIcon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-secondary);
  border-radius: 8px;
}

.modeItemContent {
  flex: 1;
}

.modeItemHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.modeItemName {
  font-weight: 500;
  font-size: 14px;
}

.modeBadgePremium {
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 4px;
}

.modeBadgeActive {
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  background: var(--success);
  color: white;
  border-radius: 4px;
}

.modeItemDescription {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.modeSwitcherFooter {
  padding: 12px 16px;
  border-top: 1px solid var(--border-primary);
  background: var(--surface-secondary);
}

.modeSwitcherFooter p {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}
```

### 4️⃣ План интеграции (поэтапно)

Я подготовил фундамент. Реализация разбита на итерации:

**Итерация 1: Базовая инфраструктура** ✅ Готово
- Mode Registry
- Mode Switcher компонент
- Архитектурная документация

**Итерация 2: Multi-tenancy** (следующий шаг)
- Миграции БД
- RLS политики
- Helpers для работы с org_id

**Итерация 3: Platform Shell**
- Постоянный Header
- Динамический Sidebar
- Общий Layout

**Итерация 4: Миграция Finance**
- Перенос маршрутов в /finance
- Обратная совместимость API
- Тестирование

**Итерация 5: Заглушки новых режимов**
- /investments placeholder
- /personal placeholder
- /tenders placeholder

**Итерация 6: Общие настройки**
- Управление организацией
- Пользователи и роли
- Интеграции

## Что делать дальше

1. **Примените миграции БД** (шаг 1-2)
2. **Создайте CSS файл** для ModeSwitcher (шаг 3)
3. **Протестируйте Mode Registry:**

```typescript
import { getAvailableModes, checkModePermission } from '@/lib/platform/mode-registry';

// Получить доступные режимы
const modes = getAvailableModes();
console.log(modes); // [{ key: 'finance', ... }]

// Проверить права
const canEdit = checkModePermission('finance', 'member', 'edit');
console.log(canEdit); // true
```

4. **Свяжитесь со мной** для продолжения реализации Platform Shell и миграции существующего функционала

## Полезные ссылки

- [Архитектура платформы](./PLATFORM_ARCHITECTURE.md)
- [Mode Registry API](../lib/platform/mode-registry.ts)
- [Mode Switcher Component](../components/platform/ModeSwitcher.tsx)

---

**Готово к миграции!** 🚀  
Следующий шаг: применение SQL миграций
