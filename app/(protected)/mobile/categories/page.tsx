import { loadCategorySummary } from "@/lib/dashboard/category-management";
import { loadCategoryWidgetPreferences } from "@/lib/dashboard/preferences/service";
import CategoryManagementCard from "@/components/dashboard/CategoryManagementCard";
export const dynamic = 'force-dynamic';

export default async function MobileCategoriesPage() {
  const categorySummary = await loadCategorySummary();
  const prefs = await loadCategoryWidgetPreferences();

  return (
    <div className="p-4">
      <CategoryManagementCard
        initialData={categorySummary}
        initialPreferences={prefs}
      />
    </div>
  );
}
