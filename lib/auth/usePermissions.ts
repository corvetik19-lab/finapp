"use client";

import { useEffect, useState } from "react";
import type { Permission } from "./permissions";
import { hasPermission, hasAllPermissions, isAdmin, canAccessPage } from "./permissions";
import { logger } from "@/lib/logger";

export type PermissionsContextValue = {
  permissions: Permission[];
  isLoading: boolean;
  hasPermission: (permission: Permission | Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isAdmin: boolean;
  canAccessPage: (pathname: string) => boolean;
};

/**
 * Хук для проверки прав доступа в клиентских компонентах
 */
export function usePermissions(): PermissionsContextValue {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Загружаем права пользователя из API
    async function loadPermissions() {
      try {
        const response = await fetch("/api/auth/permissions");
        if (response.ok) {
          const data = await response.json();
          setPermissions(data.permissions || []);
        }
      } catch (error) {
        logger.error("Failed to load permissions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPermissions();
  }, []);

  return {
    permissions,
    isLoading,
    hasPermission: (permission) => hasPermission(permissions, permission),
    hasAllPermissions: (perms) => hasAllPermissions(permissions, perms),
    isAdmin: isAdmin(permissions),
    canAccessPage: (pathname) => canAccessPage(permissions, pathname),
  };
}
