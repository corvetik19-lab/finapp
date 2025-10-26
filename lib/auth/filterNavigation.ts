import type { Permission } from "./permissions";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  requiredPermission?: Permission;
};

type NavGroup = {
  label: string;
  icon: string;
  items: NavItem[];
  requiredPermission?: Permission;
};

export type NavConfig = NavItem | NavGroup;

// Проверка является ли элемент группой
function isNavGroup(item: NavConfig): item is NavGroup {
  return 'items' in item;
}

/**
 * Фильтрует навигацию на основе прав пользователя
 */
export function filterNavigation(
  navConfig: NavConfig[],
  userPermissions: Permission[]
): NavConfig[] {
  const isAdmin = userPermissions.includes("admin:all");

  const hasPermission = (permission: Permission) => {
    return isAdmin || userPermissions.includes(permission);
  };

  return navConfig
    .filter((item) => {
      // Админ видит все
      if (isAdmin) return true;

      // Если у элемента нет требуемых прав, показываем его
      if (!item.requiredPermission) return true;

      // Проверяем права
      if (isNavGroup(item)) {
        // Для группы проверяем хотя бы одно право из элементов
        const hasAccessToAnyItem = item.items.some(
          (subItem) =>
            !subItem.requiredPermission ||
            hasPermission(subItem.requiredPermission)
        );
        return hasAccessToAnyItem;
      } else {
        return hasPermission(item.requiredPermission);
      }
    })
    .map((item) => {
      // Фильтруем элементы внутри групп
      if (isNavGroup(item)) {
        return {
          ...item,
          items: item.items.filter(
            (subItem) =>
              isAdmin ||
              !subItem.requiredPermission ||
              hasPermission(subItem.requiredPermission)
          ),
        };
      }
      return item;
    });
}
