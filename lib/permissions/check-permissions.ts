import { createRouteClient, getCachedUser } from '@/lib/supabase/server';

export interface UserPermissions {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
  employeeId: string | null;
}

/**
 * Получить права текущего пользователя
 */
export async function getCurrentUserPermissions(): Promise<UserPermissions> {
  const { data: { user } } = await getCachedUser();
  
  if (!user) {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      permissions: [],
      employeeId: null,
    };
  }

  const supabase = await createRouteClient();

  // Проверяем глобальную роль
  const { data: profile } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('id', user.id)
    .single();

  const isSuperAdmin = profile?.global_role === 'super_admin';

  // Получаем member из company_members
  const { data: member } = await supabase
    .from('company_members')
    .select('role, permissions, role_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!member) {
    return {
      isAdmin: isSuperAdmin,
      isSuperAdmin,
      permissions: [],
      employeeId: null,
    };
  }

  const isAdmin = member.role === 'admin' || isSuperAdmin;

  // Получаем permissions из роли
  let permissions: string[] = [];
  
  if (member.role_id) {
    const { data: roleData } = await supabase
      .from('roles')
      .select('permissions')
      .eq('id', member.role_id)
      .single();
    
    if (roleData?.permissions) {
      permissions = roleData.permissions as string[];
    }
  }

  // Получаем employee_id пользователя
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .limit(1)
    .single();

  return {
    isAdmin,
    isSuperAdmin,
    permissions,
    employeeId: employee?.id || null,
  };
}

/**
 * Проверить есть ли конкретное право
 */
export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission);
}

/**
 * Проверить доступ к тендерам - возвращает нужна ли фильтрация по owner
 */
export function canViewAllTenders(userPermissions: UserPermissions): boolean {
  // Админы и супер-админы видят всё
  if (userPermissions.isAdmin || userPermissions.isSuperAdmin) {
    return true;
  }
  
  // Если есть tenders:view - видит все тендеры
  if (hasPermission(userPermissions.permissions, 'tenders:view')) {
    return true;
  }
  
  // Иначе только свои (tenders:view_own)
  return false;
}
