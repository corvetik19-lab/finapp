import { createRSCClient } from "@/lib/supabase/helpers";
import { listBudgetsWithUsage } from "@/lib/budgets/service";
import { listExpenseCategories } from "@/lib/categories/service";
import BudgetSection from "@/components/dashboard/BudgetSection";
import styles from "@/components/dashboard/Dashboard.module.css";

export const dynamic = 'force-dynamic';

export default async function MobileBudgetsPage() {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const budgets = await listBudgetsWithUsage();
  const categories = await listExpenseCategories();
  
  // Получаем валюту пользователя
  const { data: profile } = await supabase
    .from("profiles")
    .select("default_currency")
    .eq("user_id", user?.id || "")
    .single();
  
  const currency = profile?.default_currency || "RUB";

  return (
    <div className={styles.mobilePage}>
      <BudgetSection budgets={budgets} currency={currency} categories={categories} />
    </div>
  );
}
