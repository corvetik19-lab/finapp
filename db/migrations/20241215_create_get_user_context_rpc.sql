-- Миграция: создание RPC функции get_user_context
-- Оптимизирует загрузку данных пользователя в protected layout
-- Объединяет множество запросов в один

CREATE OR REPLACE FUNCTION get_user_context(p_user_id UUID, p_organization_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_profile RECORD;
  v_company_member RECORD;
  v_employee RECORD;
  v_role_name TEXT;
  v_department_name TEXT;
  v_is_super_admin BOOLEAN := FALSE;
  v_is_org_admin BOOLEAN := FALSE;
  v_position TEXT;
  v_avatar_url TEXT;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Получаем профиль пользователя
  SELECT 
    global_role,
    avatar_url,
    updated_at
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF FOUND THEN
    v_is_super_admin := v_profile.global_role = 'super_admin';
    v_is_org_admin := v_profile.global_role IN ('admin', 'super_admin');
    v_avatar_url := v_profile.avatar_url;
    v_created_at := v_profile.updated_at;
  END IF;

  -- Проверяем роль в организации (если передан organization_id)
  IF p_organization_id IS NOT NULL AND NOT v_is_org_admin THEN
    SELECT role INTO v_company_member
    FROM organization_members
    WHERE organization_id = p_organization_id
      AND user_id = p_user_id
    LIMIT 1;

    IF FOUND AND v_company_member.role IN ('admin', 'owner') THEN
      v_is_org_admin := TRUE;
    END IF;
  END IF;

  -- Получаем данные из company_members
  SELECT 
    cm.role,
    cm.role_id,
    cm.employee_id
  INTO v_company_member
  FROM company_members cm
  WHERE cm.user_id = p_user_id
    AND cm.status = 'active'
  LIMIT 1;

  IF FOUND THEN
    -- Проверяем admin роль
    IF v_company_member.role = 'admin' THEN
      v_is_org_admin := TRUE;
    END IF;

    -- Получаем название роли
    IF v_company_member.role_id IS NOT NULL THEN
      SELECT name INTO v_role_name
      FROM roles
      WHERE id = v_company_member.role_id;
    END IF;

    -- Получаем данные сотрудника
    IF v_company_member.employee_id IS NOT NULL THEN
      SELECT 
        e.position,
        d.name as department_name
      INTO v_position, v_department_name
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.id = v_company_member.employee_id;
    END IF;
  END IF;

  -- Fallback: ищем сотрудника напрямую по user_id
  IF v_role_name IS NULL AND v_position IS NULL THEN
    SELECT 
      e.position,
      r.name as role_name,
      d.name as department_name
    INTO v_position, v_role_name, v_department_name
    FROM employees e
    LEFT JOIN roles r ON r.id = e.role_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE e.user_id = p_user_id
    LIMIT 1;
  END IF;

  -- Формируем результат
  result := json_build_object(
    'is_super_admin', v_is_super_admin,
    'is_org_admin', v_is_org_admin,
    'role_name', v_role_name,
    'department_name', v_department_name,
    'position', v_position,
    'avatar_url', v_avatar_url,
    'created_at', v_created_at
  );

  RETURN result;
END;
$$;

-- Даём доступ authenticated пользователям
GRANT EXECUTE ON FUNCTION get_user_context(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION get_user_context IS 'Получает контекст пользователя для protected layout (роли, права, профиль)';
