import { Metadata } from "next";
import { getSalesLedger } from "@/lib/accounting/registers/service";
import { SalesLedgerPage } from "@/components/accounting/registers/SalesLedgerPage";

export const metadata: Metadata = {
  title: "Книга продаж | Бухгалтерия",
  description: "Книга продаж для учёта НДС",
};

export default async function SalesLedgerRoute() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentQuarter = Math.ceil((today.getMonth() + 1) / 3);
  
  const entries = await getSalesLedger(currentYear, currentQuarter);

  return (
    <SalesLedgerPage 
      initialEntries={entries}
      initialYear={currentYear}
      initialQuarter={currentQuarter}
    />
  );
}
