import { Metadata } from "next";
import { getTaxPayments, getKudirEntries, getAccountingSettings } from "@/lib/accounting/service";
import { TaxesPage } from "@/components/accounting/TaxesPage";

export const metadata: Metadata = {
  title: "Налоги | Бухгалтерия",
  description: "Расчёт и уплата налогов",
};

export default async function TaxesPageRoute() {
  const currentYear = new Date().getFullYear();
  
  const [payments, kudirEntries, settings] = await Promise.all([
    getTaxPayments({ year: currentYear }),
    getKudirEntries({ year: currentYear }),
    getAccountingSettings(),
  ]);

  return (
    <TaxesPage 
      payments={payments}
      kudirEntries={kudirEntries}
      settings={settings}
      year={currentYear}
    />
  );
}
