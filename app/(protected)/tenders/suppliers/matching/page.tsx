import { Suspense } from "react";
import { getSupplierCategories } from "@/lib/suppliers/service";
import { TenderSupplierMatcher } from "@/components/suppliers/TenderSupplierMatcher";
import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export const metadata = {
  title: "Подбор поставщиков | Тендеры",
};

async function getActiveTenders() {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data } = await supabase
    .from("tenders")
    .select("id, subject, purchase_number, status, max_price")
    .eq("company_id", companyId)
    .in("status", ["analysis", "preparation", "submitted", "contract_execution"])
    .order("created_at", { ascending: false })
    .limit(50);

  return data || [];
}

export default async function MatchingPage() {
  const [categories, tenders] = await Promise.all([
    getSupplierCategories(),
    getActiveTenders(),
  ]);

  return (
    <Suspense fallback={<div className="p-6">Загрузка...</div>}>
      <TenderSupplierMatcher 
        categories={categories}
        tenders={tenders}
      />
    </Suspense>
  );
}
