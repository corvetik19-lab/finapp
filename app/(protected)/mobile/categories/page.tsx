import { loadCategorySummary } from "@/lib/dashboard/category-management";
import { loadCategoryWidgetPreferences } from "@/lib/dashboard/preferences/service";
import CategoryManagementCard from "@/components/dashboard/CategoryManagementCard";
import styles from "@/components/dashboard/Dashboard.module.css";

export const dynamic = 'force-dynamic';

export default async function MobileCategoriesPage() {
  const categorySummary = await loadCategorySummary();
  const prefs = await loadCategoryWidgetPreferences();

  return (
    <div className={styles.mobilePage}>
      <CategoryManagementCard
        initialData={categorySummary}
        initialPreferences={prefs}
      />
    </div>
  );
}
