import { Metadata } from "next";
import { getTaxCalendarEvents, getTaxPayments, getAccountingSettings } from "@/lib/accounting/service";
import { TaxCalendarPage } from "@/components/accounting/TaxCalendarPage";

export const metadata: Metadata = {
  title: "Календарь налогов | Бухгалтерия",
  description: "Календарь налоговых платежей и отчётности",
};

export default async function TaxCalendarPageRoute() {
  const currentYear = new Date().getFullYear();
  
  const [events, payments, settings] = await Promise.all([
    getTaxCalendarEvents({ year: currentYear }),
    getTaxPayments({ year: currentYear }),
    getAccountingSettings(),
  ]);

  return (
    <TaxCalendarPage 
      events={events}
      payments={payments}
      settings={settings}
      year={currentYear}
    />
  );
}
