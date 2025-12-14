import { Metadata } from "next";
import { getTendersPnL } from "@/lib/accounting/reports";
import { TendersPnLReport } from "@/components/accounting/reports/TendersPnLReport";

export const metadata: Metadata = {
  title: "P&L по тендерам | Бухгалтерия",
  description: "Маржинальность по тендерам",
};

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function TendersPnLPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const year = params.year ? parseInt(params.year) : new Date().getFullYear();
  
  const data = await getTendersPnL(year);

  return <TendersPnLReport data={data} year={year} />;
}
