import { redirect } from "next/navigation";
import { hasUserModeAccess } from "@/lib/platform/organization";
import React from "react";

export default async function TendersLayout({ children }: { children: React.ReactNode }) {
  const hasAccess = await hasUserModeAccess('tenders');
  
  if (!hasAccess) {
    // Можно редиректить на дэшборд или страницу 403
    redirect('/');
  }

  return <>{children}</>;
}
