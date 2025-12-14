import { getInvestments } from "@/lib/investors/service";
import { ReturnsPage } from "@/components/investors/ReturnsPage";

export default async function Page() {
  const investments = await getInvestments();
  return <ReturnsPage investments={investments} />;
}
