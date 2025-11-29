import { Suspense } from "react";
import { getCustomers, getCustomersStats } from "@/lib/dictionaries/customers-service";
import CustomersPage from "@/components/dictionaries/CustomersPage";

export const dynamic = "force-dynamic";

export default async function CustomersPageRoute() {
  const [customers, stats] = await Promise.all([
    getCustomers(),
    getCustomersStats(),
  ]);

  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <CustomersPage initialCustomers={customers} stats={stats} />
    </Suspense>
  );
}
