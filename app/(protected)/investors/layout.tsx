import { redirect } from "next/navigation";
import { TendersLayout } from "@/components/tenders/tenders-layout";
import { getCurrentUserPermissions } from "@/lib/permissions/check-permissions";

export const metadata = {
  title: "Инвесторы | Финансирование",
  description: "Управление инвестициями и финансированием тендеров",
};

export default async function InvestorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const permissions = await getCurrentUserPermissions();
  
  if (!permissions.isSuperAdmin && !permissions.isAdmin && !permissions.role) {
    redirect("/dashboard");
  }

  return (
    <TendersLayout userPermissions={permissions}>
      {children}
    </TendersLayout>
  );
}
