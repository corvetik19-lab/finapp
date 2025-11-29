-- Обновляем RLS политики для таблицы roles
-- Супер-админ должен иметь возможность редактировать все роли, включая системные

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can view roles" ON roles;
DROP POLICY IF EXISTS "Users can update roles" ON roles;
DROP POLICY IF EXISTS "Users can insert roles" ON roles;
DROP POLICY IF EXISTS "Users can delete roles" ON roles;
DROP POLICY IF EXISTS "roles_select_policy" ON roles;
DROP POLICY IF EXISTS "roles_update_policy" ON roles;
DROP POLICY IF EXISTS "roles_insert_policy" ON roles;
DROP POLICY IF EXISTS "roles_delete_policy" ON roles;

-- Включаем RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Политика SELECT: все могут видеть роли своей компании или системные роли
CREATE POLICY "roles_select_policy" ON roles
FOR SELECT USING (
    -- Супер-админ видит все
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.global_role = 'super_admin'
    )
    OR
    -- Пользователи видят роли своей компании
    company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
    OR
    -- Или системные роли без привязки к компании
    (company_id IS NULL AND is_system = true)
);

-- Политика INSERT: супер-админ или админ компании может создавать роли
CREATE POLICY "roles_insert_policy" ON roles
FOR INSERT WITH CHECK (
    -- Супер-админ может создавать любые роли
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.global_role = 'super_admin'
    )
    OR
    -- Админ компании может создавать роли для своей компании
    (
        company_id IN (
            SELECT cm.company_id FROM company_members cm
            WHERE cm.user_id = auth.uid() AND cm.role = 'admin'
        )
    )
);

-- Политика UPDATE: супер-админ может редактировать ВСЕ роли (включая системные)
CREATE POLICY "roles_update_policy" ON roles
FOR UPDATE USING (
    -- Супер-админ может редактировать любые роли
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.global_role = 'super_admin'
    )
    OR
    -- Админ компании может редактировать роли своей компании (кроме системных)
    (
        is_system = false
        AND company_id IN (
            SELECT cm.company_id FROM company_members cm
            WHERE cm.user_id = auth.uid() AND cm.role = 'admin'
        )
    )
);

-- Политика DELETE: только несистемные роли можно удалять
CREATE POLICY "roles_delete_policy" ON roles
FOR DELETE USING (
    is_system = false
    AND is_default = false
    AND (
        -- Супер-админ может удалять
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.global_role = 'super_admin'
        )
        OR
        -- Админ компании может удалять роли своей компании
        company_id IN (
            SELECT cm.company_id FROM company_members cm
            WHERE cm.user_id = auth.uid() AND cm.role = 'admin'
        )
    )
);
