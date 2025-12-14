import { CategoriesPage } from "@/components/suppliers/CategoriesPage";
import { getSupplierCategories } from "@/lib/suppliers/service";

export default async function CategoriesRoute() {
  const categories = await getSupplierCategories();

  return <CategoriesPage categories={categories} />;
}
