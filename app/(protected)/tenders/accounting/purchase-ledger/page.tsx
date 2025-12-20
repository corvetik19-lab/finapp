import { Metadata } from "next";
import { getPurchaseLedger } from "@/lib/accounting/registers/service";
import { PurchaseLedgerPage } from "@/components/accounting/registers/PurchaseLedgerPage";

export const metadata: Metadata = {
  title: "Книга покупок | Бухгалтерия",
  description: "Книга покупок для учёта НДС",
};

export default async function PurchaseLedgerRoute() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentQuarter = Math.ceil((today.getMonth() + 1) / 3);
  
  const entries = await getPurchaseLedger(currentYear, currentQuarter);

  return (
    <PurchaseLedgerPage 
      initialEntries={entries}
      initialYear={currentYear}
      initialQuarter={currentQuarter}
    />
  );
}
