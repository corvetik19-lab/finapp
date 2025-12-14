import { getInvestorAccess, getSources } from "@/lib/investors/service";
import { AccessPage } from "@/components/investors/AccessPage";

export default async function Page() {
  const [accessList, sources] = await Promise.all([
    getInvestorAccess(),
    getSources(),
  ]);
  return <AccessPage accessList={accessList} sources={sources} />;
}
