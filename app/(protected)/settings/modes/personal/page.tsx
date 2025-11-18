import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/helpers";
import PersonalModeSettings from "@/components/settings/modes/PersonalModeSettings";
import type { PlanPresetRecord, PlanTypeRecord } from "@/components/settings/PlanSettingsManager";

export const dynamic = 'force-dynamic';

export default async function PersonalModeSettingsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Получаем типы планов
  const { data: planTypesData = [] } = await supabase
    .from("plan_types")
    .select("id,name,icon,color,sort_order,created_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  // Получаем пресеты планов
  const { data: planPresetsData = [] } = await supabase
    .from("plan_presets")
    .select("id,name,plan_type_id,goal_amount,monthly_contribution,priority,note,icon,sort_order,created_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const planTypes = (planTypesData || []) as PlanTypeRecord[];
  const planPresets = (planPresetsData || []) as PlanPresetRecord[];

  return <PersonalModeSettings planTypes={planTypes} planPresets={planPresets} />;
}
