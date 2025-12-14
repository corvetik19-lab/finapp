import { SuppliersPage } from "@/components/suppliers/SuppliersPage";
import { getSuppliers, getSupplierCategories, getSuppliersStats } from "@/lib/suppliers/service";

export default async function SuppliersRoute() {
  const [suppliers, categories, stats] = await Promise.all([
    getSuppliers(),
    getSupplierCategories(),
    getSuppliersStats(),
  ]);

  return (
    <SuppliersPage
      suppliers={suppliers}
      categories={categories}
      stats={stats}
    />
  );
}
