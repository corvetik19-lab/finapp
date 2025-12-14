import { notFound, redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/server";
import { getInvestorInvestmentDetails, getInvestorAccesses } from "@/lib/investors/portal";
import { getTransactions } from "@/lib/investors/service";
import { InvestorInvestmentClient } from "@/components/investors/portal/InvestorInvestmentClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvestorInvestmentPage({ params }: PageProps) {
  const { id } = await params;
  
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/investor-portal/login");
  }

  const accesses = await getInvestorAccesses(user.id);
  if (!accesses.length) {
    redirect("/investor-portal/login?error=no_access");
  }

  const investment = await getInvestorInvestmentDetails(user.id, id);
  if (!investment) {
    notFound();
  }

  const transactions = await getTransactions(id);

  // Проверяем права на финансы
  const access = accesses.find((a) => a.source_id === investment.source_id);
  const canViewFinancials = access?.can_view_financials ?? false;

  return (
    <InvestorInvestmentClient
      investment={investment}
      transactions={canViewFinancials ? transactions : []}
      canViewFinancials={canViewFinancials}
    />
  );
}
