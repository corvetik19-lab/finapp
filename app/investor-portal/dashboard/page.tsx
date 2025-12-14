import { redirect } from "next/navigation";
import { createRSCClient } from "@/lib/supabase/server";
import { getInvestorAccesses, getInvestorInvestments } from "@/lib/investors/portal";
import { InvestorDashboardClient } from "@/components/investors/portal/InvestorDashboardClient";

export default async function InvestorDashboardPage() {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/investor-portal/login");
  }

  const accesses = await getInvestorAccesses(user.id);
  
  if (!accesses.length) {
    redirect("/investor-portal/login?error=no_access");
  }

  const investments = await getInvestorInvestments(user.id);

  return (
    <InvestorDashboardClient 
      accesses={accesses} 
      investments={investments}
    />
  );
}
