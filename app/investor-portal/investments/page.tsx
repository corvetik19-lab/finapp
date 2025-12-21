import { createRSCClient } from "@/lib/supabase/server";
import { InvestorInvestmentsList } from "./investments-client";

export default async function InvestorInvestmentsPage() {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: investments } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources!investments_source_id_fkey(id, name, source_type),
      tender:tenders(id, subject, purchase_number, status)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <InvestorInvestmentsList investments={investments || []} />;
}
