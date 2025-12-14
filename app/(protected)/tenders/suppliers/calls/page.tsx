import { CallsHistoryPage } from "@/components/suppliers/CallsHistoryPage";
import { getCallHistory, getSuppliers } from "@/lib/suppliers/service";

export default async function CallsRoute() {
  const [calls, suppliers] = await Promise.all([
    getCallHistory(),
    getSuppliers(),
  ]);

  return <CallsHistoryPage calls={calls} suppliers={suppliers} />;
}
