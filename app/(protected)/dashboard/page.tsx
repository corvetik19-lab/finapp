import { createRSCClient } from "@/lib/supabase/helpers";
import styles from "@/components/dashboard/Dashboard.module.css";
import { formatMoney } from "@/lib/utils/format";
import { loadDashboardOverview } from "@/lib/dashboard/service";
import { listBudgetsWithUsage } from "@/lib/budgets/service";
import { listExpenseCategories } from "@/lib/categories/service";
import { listRecentNotes } from "@/lib/notes/service";
import { loadCategorySummary } from "@/lib/dashboard/category-management";
import BudgetSection from "@/components/dashboard/BudgetSection";
import FinancialTrendsCard from "@/components/dashboard/FinancialTrendsCard";
import ExpenseByCategoryCard from "@/components/dashboard/ExpenseByCategoryCard";
import CategoryManagementCard from "@/components/dashboard/CategoryManagementCard";
import { loadCategoryWidgetPreferences } from "@/lib/dashboard/preferences/service";
import RecentNotesCard from "@/components/dashboard/RecentNotesCard";
import UpcomingPaymentsCard from "@/components/dashboard/UpcomingPaymentsCard";
import { loadUpcomingPayments } from "@/lib/dashboard/upcoming-payments";

type Tx = {
  id: string;
  occurred_at: string;
  amount: number; // minor units
  currency: string;
  direction: "income" | "expense" | "transfer";
  note: string | null;
};

export default async function DashboardPage() {
  const supabase = await createRSCClient();

  const overview = await loadDashboardOverview(8);
  const trendLabels = overview.trend.map((point) => point.label);
  const trendIncome = overview.trend.map((point) => point.income);
  const trendExpense = overview.trend.map((point) => point.expense);

  const { data: recent = [] } = await supabase
    .from("transactions")
    .select("id,occurred_at,amount,currency,direction,note")
    .order("occurred_at", { ascending: false })
    .limit(6);

  const breakdownTotal = overview.breakdown.reduce((sum, item) => sum + item.amount, 0);
  const budgets = await listBudgetsWithUsage();
  const categories = await listExpenseCategories();
  const notes = await listRecentNotes();
  const upcomingPaymentsRaw = await loadUpcomingPayments(6);
  const categorySummary = await loadCategorySummary();
  const categoryPreferences = await loadCategoryWidgetPreferences();

  const upcomingPayments = upcomingPaymentsRaw.map((item) => ({
    id: item.id,
    name: item.name ?? "Без названия",
    dueDate: item.due_date,
    amountMinor: item.amount_minor ?? 0,
    accountName: item.account_name ?? undefined,
    direction: item.direction ?? undefined,
    description: item.description ?? undefined,
  }));

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div className={styles.pageTitle}>Дашборд</div>
        <div className={styles.actions}>
          <i className="material-icons" aria-hidden>
            search
          </i>
          <i className="material-icons" aria-hidden>
            notifications
          </i>
        </div>
      </div>

      <section className={styles.banner}>
        <div>
          <div className={styles.bannerTitle}>Добро пожаловать!</div>
          <div className={styles.bannerSub}>Краткий обзор ваших финансов за последние месяцы</div>
        </div>
        <div className="material-icons" aria-hidden style={{ fontSize: 56, opacity: 0.9 }}>
          insights
        </div>
      </section>

      <BudgetSection budgets={budgets} currency={overview.currency} categories={categories} />

      <section className={styles.summaryGrid}>
        <div className={styles.card}>
          <div className={`${styles.cardIcon} balance`}><span className="material-icons">account_balance_wallet</span></div>
          <div className={styles.cardTitle}>Итог месяца</div>
          <div className={styles.cardValue}>{formatMoney(Math.round(overview.net * 100), overview.currency)}</div>
        </div>
        <div className={styles.card}>
          <div className={`${styles.cardIcon} income`}><span className="material-icons">trending_up</span></div>
          <div className={styles.cardTitle}>Доходы (месяц)</div>
          <div className={styles.cardValue}>{formatMoney(Math.round(overview.topIncome * 100), overview.currency)}</div>
        </div>
        <div className={styles.card}>
          <div className={`${styles.cardIcon} expense`}><span className="material-icons">trending_down</span></div>
          <div className={styles.cardTitle}>Расходы (месяц)</div>
          <div className={styles.cardValue}>{formatMoney(Math.round(overview.topExpense * 100), overview.currency)}</div>
        </div>
        <div className={styles.card}>
          <div className={`${styles.cardIcon} invest`}><span className="material-icons">savings</span></div>
          <div className={styles.cardTitle}>Инвестиции</div>
          <div className={styles.cardValue}>—</div>
        </div>
      </section>

      <section className={styles.grid2}>
        <FinancialTrendsCard
          labels={trendLabels}
          income={trendIncome}
          expense={trendExpense}
          currency={overview.currency}
          initialMonths={12}
        />
        <div className={styles.listCard}>
          <div className={styles.listHeader}>Последние транзакции</div>
          <div>
            {(recent as Tx[]).map((t) => (
              <div key={t.id} className={styles.listItem}>
                <div className={styles.listItemText}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {t.note || (t.direction === "income" ? "Доход" : t.direction === "expense" ? "Расход" : "Перевод")}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {new Date(t.occurred_at).toLocaleString("ru-RU")}
                  </div>
                </div>
                <div
                  className={`${styles.listItemAmount} ${t.direction === "income" ? styles.amountIncome : styles.amountExpense}`}
                >
                  {formatMoney(t.amount, t.currency)}
                </div>
              </div>
            ))}
            {(recent as Tx[]).length === 0 && <div style={{ color: "#888" }}>Нет данных</div>}
          </div>
        </div>
      </section>

      <section className={styles.grid2}>
        <ExpenseByCategoryCard
          breakdown={overview.breakdown}
          currency={overview.currency}
          total={breakdownTotal}
          range={overview.range}
        />
        <RecentNotesCard notes={notes} />
      </section>

      <section className={styles.widgetsGrid}>
        <UpcomingPaymentsCard payments={upcomingPayments} defaultCurrency={overview.currency} />
      </section>

      <CategoryManagementCard
        initialData={categorySummary}
        initialPreferences={categoryPreferences}
      />
    </div>
  );
}
