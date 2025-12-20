import { Metadata } from "next";
import { getBankIntegrations } from "@/lib/accounting/bank-service";
import { BankRulesPage } from "@/components/accounting/bank/BankRulesPage";

export const metadata: Metadata = {
  title: "Правила обработки | Бухгалтерия",
  description: "Правила автоматической обработки банковских транзакций",
};

export default async function BankRulesRoute() {
  const integrations = await getBankIntegrations();

  return <BankRulesPage integrations={integrations} />;
}
