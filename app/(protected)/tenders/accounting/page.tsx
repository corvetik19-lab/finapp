import { Metadata } from "next";
import { 
  getAccountingSettings, 
  getAccountingDashboardStats, 
  getUpcomingTaxPayments,
  getExtendedDashboardStats,
  getRecentDocuments
} from "@/lib/accounting/service";
import { AccountingDashboardPro } from "@/components/accounting/AccountingDashboardPro";

export const metadata: Metadata = {
  title: "Бухгалтерия | Тендеры",
  description: "Бухгалтерский учёт и документооборот",
};

export default async function AccountingPage() {
  const [settings, stats, upcomingTaxes, extendedStats, recentDocs] = await Promise.all([
    getAccountingSettings(),
    getAccountingDashboardStats(),
    getUpcomingTaxPayments(90),
    getExtendedDashboardStats(),
    getRecentDocuments(5),
  ]);

  return (
    <AccountingDashboardPro
      settings={settings}
      stats={stats}
      upcomingTaxes={upcomingTaxes}
      extendedStats={extendedStats}
      recentDocuments={recentDocs}
    />
  );
}
