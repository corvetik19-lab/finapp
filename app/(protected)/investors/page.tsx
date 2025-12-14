import { getInvestments, getSources } from "@/lib/investors/service";
import { InvestorsDashboard } from "@/components/investors/InvestorsDashboard";

export default async function InvestorsPage() {
  const [investments, sources] = await Promise.all([
    getInvestments(),
    getSources(),
  ]);

  return <InvestorsDashboard investments={investments} sources={sources} />;
}
