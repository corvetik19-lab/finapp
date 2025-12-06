import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCachedUser, createRouteClient } from "@/lib/supabase/server";
import SettingsNav from "@/components/settings/SettingsNav";

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

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r p-6 space-y-6">
        <div><h1 className="text-xl font-bold">Настройки</h1><p className="text-sm text-muted-foreground">Управление приложением</p></div>
        <SettingsNav />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
