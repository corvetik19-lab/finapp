import { Metadata } from "next";
import { getBankIntegrations, getBankAccounts } from "@/lib/accounting/bank-service";
import { BankIntegrationsPage } from "@/components/accounting/BankIntegrationsPage";

export const metadata: Metadata = {
  title: "Банковские интеграции | Бухгалтерия",
  description: "Подключение банков по API",
};

export default async function BankIntegrationsPageRoute() {
  const [integrations, accounts] = await Promise.all([
    getBankIntegrations(),
    getBankAccounts(),
  ]);

  return (
    <BankIntegrationsPage 
      integrations={integrations}
      accounts={accounts}
    />
  );
}
