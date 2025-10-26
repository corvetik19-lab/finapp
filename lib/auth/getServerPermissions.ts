import { createRSCClient } from "@/lib/supabase/helpers";
import type { Permission } from "./permissions";

/**
 * Получает права доступа текущего пользователя на сервере
 */
export async function getServerPermissions(): Promise<Permission[]> {
  try {
    const supabase = await createRSCClient();
    
    // Получаем текущего пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return [];
    }

    // Получаем роль пользователя
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role_id, roles(permissions)")
      .eq("user_id", user.id)
      .single();

    // Если таблица user_roles не существует или у пользователя нет роли,
    // даём полный доступ (все пользователи - администраторы по умолчанию)
    if (roleError || !userRole) {
      console.log("No role found for user, granting admin access");
      return ["admin:all"];
    }

    let permissions: Permission[] = [];

    if (userRole && userRole.roles) {
      // @ts-expect-error - Supabase types
      permissions = userRole.roles.permissions || [];
    }

    console.log("User permissions loaded:", {
      userId: user.id,
      roleId: userRole.role_id,
      permissions: permissions,
      permissionsCount: permissions.length
    });

    // Если у роли нет прав, даём базовый доступ к дашборду
    if (permissions.length === 0) {
      console.log("Role has no permissions, granting basic dashboard access");
      permissions = ["dashboard:view"];
    }

    // Первый созданный пользователь считается администратором
    const { data: allUsers } = await supabase
      .from("user_roles")
      .select("user_id, created_at")
      .order("created_at", { ascending: true })
      .limit(1);

    const isFirstUser = allUsers?.[0]?.user_id === user.id;
    
    if (isFirstUser) {
      console.log("User is first user, granting admin access");
      permissions = ["admin:all", ...permissions];
    }

    console.log("Final permissions:", permissions);
    return permissions;
  } catch (error) {
    console.error("Error loading permissions:", error);
    // В случае ошибки даём полный доступ
    return ["admin:all"];
  }
}
