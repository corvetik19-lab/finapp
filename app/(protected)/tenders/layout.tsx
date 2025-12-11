import { redirect } from "next/navigation";
import { hasUserModeAccess } from "@/lib/platform/organization";
import React from "react";
import { TendersLayout as TendersLayoutWrapper } from "@/components/tenders/tenders-layout";
import { getCurrentUserPermissions } from "@/lib/permissions/check-permissions";

export default async function TendersLayout({ children }: { children: React.ReactNode }) {
  const hasAccess = await hasUserModeAccess('tenders');
  
  if (!hasAccess) {
    redirect('/');
  }

  const userPermissions = await getCurrentUserPermissions();

  return (
    <TendersLayoutWrapper userPermissions={userPermissions}>
      {children}
    </TendersLayoutWrapper>
  );
}
