import { loadLoans, loadLoansSummary } from "@/lib/loans/service";
import LoansPageClient from "./LoansPageClient";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

export default async function LoansPage() {
  const [loans, summary] = await Promise.all([
    loadLoans(),
    loadLoansSummary(),
  ]);

  return <LoansPageClient loans={loans} summary={summary} />;
}
