import { redirect } from "next/navigation";
import { hasUserModeAccess } from "@/lib/platform/organization";

export default async function PersonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasAccess = await hasUserModeAccess('personal');
  
  if (!hasAccess) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
