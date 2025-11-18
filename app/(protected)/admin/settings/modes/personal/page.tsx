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

  // TODO: Загрузить planTypes и planPresets из БД
  const planTypes: PlanTypeRecord[] = [];
  const planPresets: PlanPresetRecord[] = [];

  return <PersonalModeSettings planTypes={planTypes} planPresets={planPresets} />;
}
