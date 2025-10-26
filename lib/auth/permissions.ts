// Утилиты для работы с правами доступа

export type Permission = string;

/**
 * Проверяет наличие прав доступа у пользователя
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission | Permission[]
): boolean {
  if (Array.isArray(requiredPermission)) {
    // Проверяем, есть ли хотя бы одно из требуемых прав
    return requiredPermission.some((perm) => userPermissions.includes(perm));
  }
  return userPermissions.includes(requiredPermission);
}

/**
 * Проверяет наличие всех указанных прав доступа
 */
export function hasAllPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every((perm) => userPermissions.includes(perm));
}

/**
 * Проверяет, является ли пользователь администратором
 * (администраторы имеют все права по умолчанию)
 */
export function isAdmin(userPermissions: Permission[]): boolean {
  return userPermissions.includes("admin:all");
}

/**
 * Получает эффективные права пользователя с учётом роли администратора
 */
export function getEffectivePermissions(
  userPermissions: Permission[]
): Permission[] {
  if (isAdmin(userPermissions)) {
    // Администратор имеет все права
    return ["admin:all", ...userPermissions];
  }
  return userPermissions;
}

// Карта страниц и требуемых для них прав
export const PAGE_PERMISSIONS: Record<string, Permission[]> = {
  "/dashboard": ["dashboard:view"],
  "/transactions": ["transactions:view"],
  "/budgets": ["budgets:view"],
  "/reports": ["reports:view"],
  "/reports/custom": ["reports:view"],
  "/settings": ["settings:view"],
  "/settings/categories": ["settings:view"],
  "/settings/users": ["users:view"],
  "/settings/roles": ["roles:view"],
  "/plans": ["dashboard:view"], // планы как часть дашборда
  "/loans": ["transactions:view"], // кредиты как часть транзакций
  "/payments": ["transactions:view"], // платежи как часть транзакций
};

/**
 * Проверяет доступ к странице
 */
export function canAccessPage(
  userPermissions: Permission[],
  pathname: string
): boolean {
  // Админ имеет доступ ко всем страницам
  if (isAdmin(userPermissions)) {
    return true;
  }

  // Публичные страницы доступны всем
  const publicPages = ["/login", "/register", "/", "/privacy", "/terms"];
  if (publicPages.includes(pathname)) {
    return true;
  }

  // Проверяем права для конкретной страницы
  const requiredPermissions = PAGE_PERMISSIONS[pathname];
  if (requiredPermissions) {
    return hasPermission(userPermissions, requiredPermissions);
  }

  // Если права не определены, по умолчанию разрешаем доступ
  // (можно изменить на false для более строгой политики)
  return true;
}
