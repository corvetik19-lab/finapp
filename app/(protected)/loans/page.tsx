import { loadLoans, loadLoansSummary } from "@/lib/loans/service";
import LoansPageClient from "./LoansPageClient";

export default async function LoansPage() {
  const [loans, summary] = await Promise.all([
    loadLoans(),
    loadLoansSummary(),
  ]);

  return <LoansPageClient loans={loans} summary={summary} />;
}
