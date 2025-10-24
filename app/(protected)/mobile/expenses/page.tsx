import { loadDashboardOverview } from "@/lib/dashboard/service";
import ExpenseByCategoryCard from "@/components/dashboard/ExpenseByCategoryCard";
import styles from "@/components/dashboard/Dashboard.module.css";

export const dynamic = 'force-dynamic';

export default async function MobileExpensesPage() {
  const overview = await loadDashboardOverview(8);
  const breakdownTotal = overview.breakdown.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className={styles.mobilePage}>
      <ExpenseByCategoryCard
        breakdown={overview.breakdown}
        total={breakdownTotal}
        currency={overview.currency}
      />
    </div>
  );
}
