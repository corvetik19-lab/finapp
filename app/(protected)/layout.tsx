import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import ProtectedShell from "@/components/layout/ProtectedShell";
import OfflineIndicator from "@/components/offline/OfflineIndicator";
import { getServerPermissions } from "@/lib/auth/getServerPermissions";
import { filterNavigation } from "@/lib/auth/filterNavigation";
import { NAV_CONFIG } from "@/lib/navigation/navConfig";

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

  return (
    <>
      <OfflineIndicator />
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
