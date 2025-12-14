import { redirect } from "next/navigation";
import { getCurrentUserPermissions } from "@/lib/permissions/check-permissions";

export default async function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const permissions = await getCurrentUserPermissions();
  
  // Доступ только для super_admin и admin организации
  if (!permissions.isSuperAdmin && !permissions.isAdmin) {
    redirect("/tenders/dashboard");
  }

  // Layout теперь простой - sidebar управляется в TendersLayout
  return <>{children}</>;
}
