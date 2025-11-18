import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import IntegrationsManager from "@/components/settings/IntegrationsManager";

export const dynamic = 'force-dynamic';

export default async function IntegrationsSettingsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Получаем интеграции организации
  const { data: integrations = [] } = await supabase
    .from("organization_integrations")
    .select("*")
    .order("created_at", { ascending: false });

  return <IntegrationsManager integrations={integrations || []} />;
}
