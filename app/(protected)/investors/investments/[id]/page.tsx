import { notFound } from "next/navigation";
import { getInvestmentById, getTransactions, getSchedule } from "@/lib/investors/service";
import { InvestmentDetailsClient } from "@/components/investors/InvestmentDetailsClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvestmentDetailsPage({ params }: PageProps) {
  const { id } = await params;
  
  const [investment, transactions, schedule] = await Promise.all([
    getInvestmentById(id),
    getTransactions(id),
    getSchedule(id),
  ]);

  if (!investment) {
    notFound();
  }

  return (
    <InvestmentDetailsClient
      investment={investment}
      transactions={transactions}
      schedule={schedule}
    />
  );
}
