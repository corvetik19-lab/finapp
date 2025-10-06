import PlansPageClient from "@/components/plans/PlansPageClient";
import { listPlansWithActivity } from "@/lib/plans/service";

export default async function PlansPage() {
  const plans = await listPlansWithActivity();
  return <PlansPageClient plans={plans} />;
}
