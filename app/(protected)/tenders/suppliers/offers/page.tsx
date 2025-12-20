import { Suspense } from "react";
import { TenderOffersComparison } from "@/components/suppliers/TenderOffersComparison";
import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export const metadata = {
  title: "Сравнение КП | Тендеры",
};

async function getTendersWithOffers() {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data } = await supabase
    .from("tenders")
    .select(`
      id, subject, purchase_number, status, max_price,
      supplier_tenders(count)
    `)
    .eq("company_id", companyId)
    .in("status", ["analysis", "preparation", "submitted", "contract_execution"])
    .order("created_at", { ascending: false })
    .limit(50);

  return (data || []).filter(t => {
    const count = (t.supplier_tenders as unknown as { count: number }[])?.[0]?.count || 0;
    return count > 0;
  });
}

export default async function OffersPage() {
  const tenders = await getTendersWithOffers();

  return (
    <Suspense fallback={<div className="p-6">Загрузка...</div>}>
      <TenderOffersComparison tenders={tenders} />
    </Suspense>
  );
}
