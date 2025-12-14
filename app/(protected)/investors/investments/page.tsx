import { getInvestments, getSources } from "@/lib/investors/service";
import { InvestmentsPage } from "@/components/investors/InvestmentsPage";

export default async function Page() {
  const [investments, sources] = await Promise.all([
    getInvestments(),
    getSources(),
  ]);
  return <InvestmentsPage investments={investments} sources={sources} />;
}
