import { Metadata } from "next";
import { getCashBookSummary, getAvailableCashBookMonths } from "@/lib/accounting/documents/cash-book";
import { CashBookPage } from "@/components/accounting/documents/CashBookPage";

export const metadata: Metadata = {
  title: "Кассовая книга | Бухгалтерия",
  description: "Кассовая книга организации",
};

export default async function CashBookRoute() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  
  const [summary, availableMonths] = await Promise.all([
    getCashBookSummary(year, month),
    getAvailableCashBookMonths(),
  ]);

  return (
    <CashBookPage 
      initialSummary={summary}
      availableMonths={availableMonths}
      currentYear={year}
      currentMonth={month}
    />
  );
}
