import { Metadata } from "next";
import { getBankIntegrations } from "@/lib/accounting/bank-service";
import { BankConnectionsPage } from "@/components/accounting/bank/BankConnectionsPage";

export const metadata: Metadata = {
  title: "Банковские подключения | Бухгалтерия",
  description: "Управление подключениями к банкам",
};

export default async function BankConnectionsRoute() {
  const connections = await getBankIntegrations();

  return <BankConnectionsPage connections={connections} />;
}
