import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import ProtectedShell from "@/components/layout/ProtectedShell";
import PlatformHeader from "@/components/platform/PlatformHeader";
import OfflineIndicator from "@/components/offline/OfflineIndicator";
import { getCurrentOrganization } from "@/lib/platform/organization";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
      <ProtectedShell>
        {children}
      </ProtectedShell>
    </>
  );
}
