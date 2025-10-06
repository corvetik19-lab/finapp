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
import { loadCategoryWidgetPreferences, loadWidgetVisibility, isWidgetVisible } from "@/lib/dashboard/preferences/service";
import RecentNotesCard from "@/components/dashboard/RecentNotesCard";
import UpcomingPaymentsCard from "@/components/dashboard/UpcomingPaymentsCard";
import PlansWidget from "@/components/dashboard/PlansWidget";
import NetWorthWidget from "@/components/dashboard/NetWorthWidget";
import { loadUpcomingPayments } from "@/lib/dashboard/upcoming-payments";
import { listPlansWithActivity } from "@/lib/plans/service";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { DASHBOARD_WIDGETS } from "@/lib/dashboard/preferences/shared";

export default async function DashboardPage() {
  const supabase = await createRSCClient();

  // Получаем данные текущего пользователя
  const { data: { user } } = await supabase.auth.getUser();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Пользователь';

  const overview = await loadDashboardOverview(8);
  const trendLabels = overview.trend.map((point) => point.label);
  const trendIncome = overview.trend.map((point) => point.income);
  const trendExpense = overview.trend.map((point) => point.expense);

  const breakdownTotal = overview.breakdown.reduce((sum, item) => sum + item.amount, 0);
  const budgets = await listBudgetsWithUsage();
  const categories = await listExpenseCategories();
  const notes = await listRecentNotes();
  const upcomingPaymentsRaw = await loadUpcomingPayments(6);
  const plans = await listPlansWithActivity();
  const categorySummary = await loadCategorySummary();

  const upcomingPayments = upcomingPaymentsRaw.map((p) => ({
    id: p.id,
    name: p.name || "",
    dueDate: p.due_date,
    amountMinor: p.amount_minor,
    currency: p.currency || "RUB",
    accountName: p.account_name || "",
    direction: p.direction || "expense",
    status: p.status || "pending",
    paidAt: p.paid_at,
    paidTransactionId: p.paid_transaction_id,
  }));

  const prefs = await loadCategoryWidgetPreferences();
  const widgetVisibility = await loadWidgetVisibility();

  // Загружаем счета пользователя из базы
  const { data: accountsRaw = [] } = await supabase
    .from("accounts")
    .select("id,name,balance,currency,type,credit_limit")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  // Загружаем кредиты
  const { data: loansRaw = [] } = await supabase
    .from("loans")
    .select("id,name,principal_amount,principal_paid,currency,status")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const accountsByType: Record<
    string,
    { balance: number; count: number; currency: string }
  > = {};

  // Обработка обычных счетов и дебетовых карт
  (accountsRaw || []).forEach((acc) => {
    const isCreditCard = acc.type === "card" && acc.credit_limit != null && acc.credit_limit > 0;
    
    if (isCreditCard) {
      // Кредитные карты - это долг (отрицательный баланс = задолженность)
      if (!accountsByType["credit_card"]) {
        accountsByType["credit_card"] = { balance: 0, count: 0, currency: acc.currency };
      }
      accountsByType["credit_card"].balance += Math.abs(acc.balance || 0);
      accountsByType["credit_card"].count += 1;
    } else {
      // Обычные счета (дебетовые карты, наличные, депозиты)
      const type = acc.type || "other";
      if (!accountsByType[type]) {
        accountsByType[type] = { balance: 0, count: 0, currency: acc.currency };
      }
      accountsByType[type].balance += acc.balance || 0;
      accountsByType[type].count += 1;
    }
  });

  // Обработка кредитов
  if (loansRaw && loansRaw.length > 0) {
    const activeLoans = loansRaw.filter((loan) => loan.status === "active");
    if (activeLoans.length > 0) {
      const totalLoanDebt = activeLoans.reduce((sum, loan) => {
        const principalAmount = loan.principal_amount / 100;
        const principalPaid = loan.principal_paid / 100;
        const remainingDebt = principalAmount - principalPaid;
        return sum + remainingDebt * 100; // возвращаем в минорные единицы
      }, 0);
      
      accountsByType["loan"] = {
        balance: totalLoanDebt,
        count: activeLoans.length,
        currency: activeLoans[0].currency || "RUB"
      };
    }
  }

  // Маппинг типов на отображаемые названия и иконки
  const typeConfig: Record<
    string,
    { name: string; icon: string; iconClass: string; isDebt: boolean }
  > = {
    cash: { name: "Наличные", icon: "payments", iconClass: "assetIconBank", isDebt: false },
    card: { name: "Дебетовые карты", icon: "payment", iconClass: "assetIconBank", isDebt: false },
    deposit: { name: "Депозиты", icon: "account_balance", iconClass: "assetIconBank", isDebt: false },
    credit_card: { name: "Кредитные карты", icon: "credit_card", iconClass: "assetIconDebt", isDebt: true },
    loan: { name: "Кредиты", icon: "account_balance", iconClass: "assetIconDebt", isDebt: true },
    other: { name: "Другие активы", icon: "folder", iconClass: "assetIconProperty", isDebt: false },
  };

  // Формируем список для отображения, включая все типы из конфига
  const accountGroups = Object.keys(typeConfig).map((type) => {
    const config = typeConfig[type];
    const data = accountsByType[type] || { balance: 0, count: 0, currency: "RUB" };

    return {
      type,
      name: config.name,
      icon: config.icon,
      iconClass: config.iconClass,
      balance: data.balance,
      count: data.count,
      currency: data.currency,
      isDebt: config.isDebt,
    };
  }).filter((group) => group.balance > 0 || group.isDebt); // Показываем только если есть баланс или это долг

  const totalAssets = accountGroups
    .filter((g) => !g.isDebt)
    .reduce((sum, g) => sum + g.balance, 0);

  const totalDebts = accountGroups
    .filter((g) => g.isDebt)
    .reduce((sum, g) => sum + g.balance, 0);

  return (
    <DashboardClient widgetVisibility={widgetVisibility}>
      <section className={styles.banner}>
        <div>
          <div className={styles.bannerTitle}>Добро пожаловать, {userName}!</div>
          <div className={styles.bannerSub}>Краткий обзор ваших финансов за последние месяцы</div>
        </div>
        <div className="material-icons" aria-hidden style={{ fontSize: 56, opacity: 0.9 }}>
          insights
        </div>
      </section>

      {isWidgetVisible(DASHBOARD_WIDGETS.BUDGET, widgetVisibility) && (
        <BudgetSection budgets={budgets} currency={overview.currency} categories={categories} />
      )}

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
      </section>

      <section className={styles.grid2}>
        {isWidgetVisible(DASHBOARD_WIDGETS.FINANCIAL_TRENDS, widgetVisibility) && (
          <FinancialTrendsCard
            labels={trendLabels}
            income={trendIncome}
            expense={trendExpense}
            currency={overview.currency}
            initialMonths={12}
          />
        )}
        {isWidgetVisible(DASHBOARD_WIDGETS.EXPENSE_BY_CATEGORY, widgetVisibility) && (
          <ExpenseByCategoryCard
            breakdown={overview.breakdown}
            total={breakdownTotal}
            currency={overview.currency}
          />
        )}
      </section>

      <section className={styles.widgetsGrid}>
        {isWidgetVisible(DASHBOARD_WIDGETS.NET_WORTH, widgetVisibility) && (
          <NetWorthWidget
            accounts={accountGroups}
            totalAssets={totalAssets}
            totalDebts={totalDebts}
            currency={overview.currency}
          />
        )}
        {isWidgetVisible(DASHBOARD_WIDGETS.PLANS, widgetVisibility) && (
          <PlansWidget plans={plans} currency={overview.currency} />
        )}
        {isWidgetVisible(DASHBOARD_WIDGETS.UPCOMING_PAYMENTS, widgetVisibility) && (
          <UpcomingPaymentsCard payments={upcomingPayments} />
        )}
        {isWidgetVisible(DASHBOARD_WIDGETS.RECENT_NOTES, widgetVisibility) && (
          <RecentNotesCard notes={notes} />
        )}
      </section>

      {isWidgetVisible(DASHBOARD_WIDGETS.CATEGORY_MANAGEMENT, widgetVisibility) && (
        <CategoryManagementCard
          initialData={categorySummary}
          initialPreferences={prefs}
        />
      )}
    </DashboardClient>
  );
}
