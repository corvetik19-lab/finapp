import { Metadata } from "next";
import { AccountingReportsPage } from "@/components/accounting/AccountingReportsPage";

export const metadata: Metadata = {
  title: "Отчёты | Бухгалтерия",
  description: "Бухгалтерские отчёты и аналитика",
};

export default function ReportsPageRoute() {
  return <AccountingReportsPage />;
}
