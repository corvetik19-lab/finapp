import { Metadata } from "next";
import { getReconciliationActs } from "@/lib/accounting/documents/reconciliation-service";
import { getCounterparties } from "@/lib/accounting/service";
import { ReconciliationActsPage } from "@/components/accounting/documents/ReconciliationActsPage";

export const metadata: Metadata = {
  title: "Акты сверки | Бухгалтерия",
  description: "Акты сверки взаиморасчётов с контрагентами",
};

export default async function ReconciliationActsRoute() {
  const [acts, counterparties] = await Promise.all([
    getReconciliationActs(),
    getCounterparties(),
  ]);

  return (
    <ReconciliationActsPage 
      acts={acts} 
      counterparties={counterparties} 
    />
  );
}
