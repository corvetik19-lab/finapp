import PlansPageClient from "@/components/plans/PlansPageClient";
import { listPlansWithActivity } from "@/lib/plans/service";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  const plans = await listPlansWithActivity();
  return <PlansPageClient plans={plans} />;
}
