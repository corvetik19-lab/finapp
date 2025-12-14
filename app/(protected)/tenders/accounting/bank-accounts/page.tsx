import { Metadata } from "next";
import { getBankAccounts, getBankIntegrations, getBankAccountsStats } from "@/lib/accounting/bank-service";
import { BankAccountsPage } from "@/components/accounting/BankAccountsPage";

export const metadata: Metadata = {
  title: "Расчётные счета | Бухгалтерия",
  description: "Управление расчётными счетами организации",
};

export default async function BankAccountsPageRoute() {
  const [accounts, integrations, stats] = await Promise.all([
    getBankAccounts(),
    getBankIntegrations(),
    getBankAccountsStats(),
  ]);

  return (
    <BankAccountsPage 
      accounts={accounts}
      integrations={integrations}
      stats={stats}
    />
  );
}
