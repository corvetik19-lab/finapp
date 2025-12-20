import { Metadata } from "next";
import { getBankTransactions, getBankIntegrations } from "@/lib/accounting/bank-service";
import { BankTransactionsPage } from "@/components/accounting/bank/BankTransactionsPage";

export const metadata: Metadata = {
  title: "Банковские транзакции | Бухгалтерия",
  description: "Просмотр и обработка банковских транзакций",
};

export default async function BankTransactionsRoute() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [transactions, connections] = await Promise.all([
    getBankTransactions({
      dateFrom: startOfMonth.toISOString().split("T")[0],
      dateTo: endOfMonth.toISOString().split("T")[0],
    }),
    getBankIntegrations(),
  ]);

  return (
    <BankTransactionsPage 
      initialTransactions={transactions}
      connections={connections}
      initialStartDate={startOfMonth.toISOString().split("T")[0]}
      initialEndDate={endOfMonth.toISOString().split("T")[0]}
    />
  );
}
