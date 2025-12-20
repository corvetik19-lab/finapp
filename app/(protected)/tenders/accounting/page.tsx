import { Metadata } from "next";
import { getAccountingSettings } from "@/lib/accounting/service";
import { 
  getFinancialOverview, 
  getReceivablesData,
  getPayablesData,
  getTenderProfitabilityData,
  getTaxCalendarData,
  getUnpaidInvoicesData,
} from "@/lib/accounting/dashboard/widgets-service";
import { AccountingDashboardNew } from "@/components/accounting/dashboard";

export const metadata: Metadata = {
  title: "Бухгалтерия | Тендеры",
  description: "Бухгалтерский учёт и документооборот",
};

export default async function AccountingPage() {
  const filters = { period: 'month' as const };
  
  const [
    settings,
    financialOverview,
    receivables,
    payables,
    tenderProfitability,
    taxCalendar,
    unpaidInvoices,
  ] = await Promise.all([
    getAccountingSettings(),
    getFinancialOverview(filters),
    getReceivablesData(),
    getPayablesData(),
    getTenderProfitabilityData(),
    getTaxCalendarData(),
    getUnpaidInvoicesData(),
  ]);

  return (
    <AccountingDashboardNew
      settings={settings}
      financialOverview={financialOverview}
      receivables={receivables}
      payables={payables}
      tenderProfitability={tenderProfitability}
      taxCalendar={taxCalendar}
      unpaidInvoices={unpaidInvoices}
    />
  );
}
