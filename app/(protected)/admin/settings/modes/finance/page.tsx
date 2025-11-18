import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import FinanceModeSettings from "@/components/settings/modes/FinanceModeSettings";

export const dynamic = 'force-dynamic';

export default async function FinanceModeSettingsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Получаем настройки режима
  const { data: modeSettings } = await supabase
    .from("organization_mode_settings")
    .select("*")
    .eq("mode", "finance")
    .single();

  // Получаем категории
  const { data: categories = [] } = await supabase
    .from("categories")
    .select("id,name,kind,parent_id")
    .order("name", { ascending: true });

  return (
    <FinanceModeSettings 
      settings={modeSettings || {}} 
      categories={categories || []}
    />
  );
}
