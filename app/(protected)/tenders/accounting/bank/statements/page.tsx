import { Metadata } from "next";
import { getBankTransactions, getBankIntegrations } from "@/lib/accounting/bank-service";
import { BankStatementsPage } from "@/components/accounting/bank/BankStatementsPage";

export const metadata: Metadata = {
  title: "Банковские выписки | Бухгалтерия",
  description: "Просмотр банковских выписок",
};

export default async function BankStatementsRoute() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [statements, connections] = await Promise.all([
    getBankTransactions({
      dateFrom: startOfMonth.toISOString().split("T")[0],
      dateTo: endOfMonth.toISOString().split("T")[0],
    }),
    getBankIntegrations(),
  ]);

  return (
    <BankStatementsPage 
      initialStatements={statements}
      connections={connections}
      initialStartDate={startOfMonth.toISOString().split("T")[0]}
      initialEndDate={endOfMonth.toISOString().split("T")[0]}
    />
  );
}
