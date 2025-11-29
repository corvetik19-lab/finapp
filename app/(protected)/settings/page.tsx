import { redirect } from "next/navigation";
import { getCachedUser, createRouteClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
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

  // Супер-админ перенаправляется на админские настройки
  if (profile?.global_role === 'super_admin') {
    redirect("/admin/settings");
  }

  redirect("/settings/overview");
}
