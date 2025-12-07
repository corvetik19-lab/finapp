import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCachedUser, createRouteClient } from "@/lib/supabase/server";
import { SettingsLayoutWrapper } from "@/components/settings/settings-layout";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const { data: { user } } = await getCachedUser();
  
  if (!user) {
    redirect("/login");
  }

  const supabase = await createRouteClient();
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('id', user.id)
    .single();

  if (profile?.global_role === 'super_admin') {
    redirect("/admin/settings");
  }

  return <SettingsLayoutWrapper>{children}</SettingsLayoutWrapper>;
}
