import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import ProtectedShell from "@/components/layout/ProtectedShell";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <ProtectedShell>{children}</ProtectedShell>;
}
