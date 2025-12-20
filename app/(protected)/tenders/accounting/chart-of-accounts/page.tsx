import { Metadata } from "next";
import { getChartOfAccounts } from "@/lib/accounting/registers/service";
import { ChartOfAccountsPage } from "@/components/accounting/registers/ChartOfAccountsPage";

export const metadata: Metadata = {
  title: "План счетов | Бухгалтерия",
  description: "План счетов бухгалтерского учёта",
};

export default async function ChartOfAccountsRoute() {
  const accounts = await getChartOfAccounts();

  return <ChartOfAccountsPage accounts={accounts} />;
}
