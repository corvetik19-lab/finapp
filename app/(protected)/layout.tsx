import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import ProtectedShell from "@/components/layout/ProtectedShell";
import OfflineIndicator from "@/components/offline/OfflineIndicator";

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

  return (
    <>
      <OfflineIndicator />
      <ProtectedShell userData={userData}>{children}</ProtectedShell>
    </>
  );
}
