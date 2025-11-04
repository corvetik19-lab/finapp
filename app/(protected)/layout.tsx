import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import ProtectedShell from "@/components/layout/ProtectedShell";
import PlatformHeader from "@/components/platform/PlatformHeader";
import OfflineIndicator from "@/components/offline/OfflineIndicator";
import { getServerPermissions } from "@/lib/auth/getServerPermissions";
import { filterNavigation } from "@/lib/auth/filterNavigation";
import { NAV_CONFIG } from "@/lib/navigation/navConfig";
import { getCurrentOrganization } from "@/lib/platform/organization";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userData = {
    email: user.email || "",
    fullName: user.user_metadata?.full_name || "",
    avatar: user.user_metadata?.avatar_url || null,
  };

  // Загружаем права пользователя на сервере
  const userPermissions = await getServerPermissions();
  
  // Фильтруем навигацию на сервере
  const filteredNavConfig = filterNavigation(NAV_CONFIG, userPermissions);

  // Получаем текущую организацию
  const organization = await getCurrentOrganization();

  return (
    <>
      <OfflineIndicator />
      <PlatformHeader
        user={{
          email: user.email,
          full_name: user.user_metadata?.full_name,
        }}
        organization={organization ? { name: organization.name } : undefined}
        notificationCount={0}
      />
      <ProtectedShell 
        userData={userData} 
        userPermissions={userPermissions}
        navConfig={filteredNavConfig}
      >
        {children}
      </ProtectedShell>
    </>
  );
}
