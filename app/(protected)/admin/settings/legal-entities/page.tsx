import { Metadata } from "next";
import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { LegalEntitiesManager } from "@/components/settings/LegalEntitiesManager";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Юридические лица | Настройки",
  description: "Управление реквизитами юридических лиц для документов",
};

export const dynamic = "force-dynamic";

export default async function LegalEntitiesPage() {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/login");
  }

  const { data: entities, error } = await supabase
    .from("legal_entities")
    .select("*")
    .eq("company_id", companyId)
    .order("is_default", { ascending: false })
    .order("full_name");

  if (error) {
    console.error("Error fetching legal entities:", error);
  }

  return <LegalEntitiesManager initialEntities={entities || []} />;
}
