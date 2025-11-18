import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import FinanceSettingsShell from "@/components/settings/FinanceSettingsShell";
import type { CategoryRecord } from "@/components/settings/CategoriesManager";

export const dynamic = 'force-dynamic';

export default async function FinanceSettingsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Получаем категории
  const { data: cats = [] } = await supabase
    .from("categories")
    .select("id,name,kind,parent_id")
    .order("name", { ascending: true });

  // Получаем настройки режима
  const { data: modeSettings } = await supabase
    .from("organization_mode_settings")
    .select("settings")
    .eq("mode", "finance")
    .single();

  const categories = (cats || []) as CategoryRecord[];

  return (
    <FinanceSettingsShell
      categories={categories}
      settings={modeSettings?.settings || {}}
    />
  );
}
