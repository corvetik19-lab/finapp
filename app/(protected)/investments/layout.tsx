import { redirect } from "next/navigation";
import { hasUserModeAccess } from "@/lib/platform/organization";

export default async function InvestmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasAccess = await hasUserModeAccess('investments');
  
  if (!hasAccess) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
