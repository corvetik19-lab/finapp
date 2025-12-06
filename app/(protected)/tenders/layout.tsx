import { redirect } from "next/navigation";
import { hasUserModeAccess } from "@/lib/platform/organization";
import React from "react";
import { TendersLayout as TendersLayoutWrapper } from "@/components/tenders/tenders-layout";

export default async function TendersLayout({ children }: { children: React.ReactNode }) {
  const hasAccess = await hasUserModeAccess('tenders');
  
  if (!hasAccess) {
    // Можно редиректить на дэшборд или страницу 403
    redirect('/');
  }

  return <TendersLayoutWrapper>{children}</TendersLayoutWrapper>;
}
