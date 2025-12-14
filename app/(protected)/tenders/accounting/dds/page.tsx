import { Metadata } from "next";
import { getCashFlowReport } from "@/lib/accounting/reports";
import { CashFlowReport } from "@/components/accounting/reports/CashFlowReport";

export const metadata: Metadata = {
  title: "Отчёт ДДС | Бухгалтерия",
  description: "Движение денежных средств",
};

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function CashFlowPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year) : new Date().getFullYear();
  const month = params.month ? parseInt(params.month) : undefined;
  
  const report = await getCashFlowReport(year, month);

  return (
    <CashFlowReport 
      report={report} 
      year={year} 
      month={month}
    />
  );
}
