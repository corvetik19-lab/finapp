import { Metadata } from "next";
import { getKudirEntries, getAccountingSettings } from "@/lib/accounting/service";
import { KudirPage } from "@/components/accounting/KudirPage";

export const metadata: Metadata = {
  title: "КУДиР | Бухгалтерия",
  description: "Книга учёта доходов и расходов",
};

export default async function KudirPageRoute() {
  const currentYear = new Date().getFullYear();
  
  const [entries, settings] = await Promise.all([
    getKudirEntries({ year: currentYear }),
    getAccountingSettings(),
  ]);

  return (
    <KudirPage 
      entries={entries} 
      settings={settings}
      year={currentYear}
    />
  );
}
