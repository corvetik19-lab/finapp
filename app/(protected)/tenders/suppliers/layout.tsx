import { redirect } from "next/navigation";
import { getCurrentUserPermissions } from "@/lib/permissions/check-permissions";

export const metadata = {
  title: "Поставщики | Тендеры",
  description: "Управление поставщиками",
};

export default async function SuppliersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const permissions = await getCurrentUserPermissions();
  
  // Доступ для всех авторизованных пользователей с ролями
  if (!permissions.isSuperAdmin && !permissions.isAdmin && !permissions.role) {
    redirect("/dashboard");
  }

  // Layout теперь простой - sidebar управляется в TendersLayout
  return <>{children}</>;
}
