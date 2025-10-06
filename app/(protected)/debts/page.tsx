import { loadDebts, loadDebtsSummary } from "@/lib/debts/service";
import DebtsPageClient from "@/components/debts/DebtsPageClient";

export default async function DebtsPage() {
  const debts = await loadDebts();
  const summary = await loadDebtsSummary();

  return <DebtsPageClient debts={debts} summary={summary} />;
}
