import { Metadata } from "next";
import { getReconciliationActs } from "@/lib/accounting/documents/reconciliation-act";
import { getCounterparties } from "@/lib/accounting/service";
import { ReconciliationPage } from "@/components/accounting/documents/ReconciliationPage";

export const metadata: Metadata = {
  title: "Акты сверки | Бухгалтерия",
  description: "Акты сверки с контрагентами",
};

export default async function ReconciliationRoute() {
  const [acts, counterparties] = await Promise.all([
    getReconciliationActs(),
    getCounterparties(),
  ]);

  return (
    <ReconciliationPage 
      acts={acts}
      counterparties={counterparties}
    />
  );
}
