import { redirect } from "next/navigation";
import { getServerPermissions } from "@/lib/auth/getServerPermissions";
import { canAccessPage, type Permission } from "@/lib/auth/permissions";

type ProtectedPageProps = {
  children: React.ReactNode;
  pathname: string;
  requiredPermissions?: Permission[];
  fallbackPath?: string;
};

/**
 * Серверный компонент для защиты страниц на основе прав доступа
 */
export default async function ProtectedPage({
  children,
  pathname,
  requiredPermissions,
  fallbackPath = "/dashboard",
}: ProtectedPageProps) {
  const permissions = await getServerPermissions();

  // Если указаны конкретные права, проверяем их
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requiredPermissions.some((perm) =>
      permissions.includes(perm)
    );
    if (!hasAccess && !permissions.includes("admin:all")) {
      redirect(fallbackPath);
    }
  } else {
    // Иначе проверяем доступ к странице по маршруту
    if (!canAccessPage(permissions, pathname)) {
      redirect(fallbackPath);
    }
  }

  return <>{children}</>;
}
