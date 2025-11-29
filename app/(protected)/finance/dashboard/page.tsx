import { createRSCClient } from "@/lib/supabase/helpers";
import styles from "@/components/dashboard/Dashboard.module.css";
import { formatMoney } from "@/lib/utils/format";
import { loadDashboardOverview } from "@/lib/dashboard/service";
import { listBudgetsWithUsage } from "@/lib/budgets/service";
import { listExpenseCategories } from "@/lib/categories/service";
import { loadCategorySummary } from "@/lib/dashboard/category-management";
import BudgetSection from "@/components/dashboard/BudgetSection";
import FinancialTrendsCard from "@/components/dashboard/FinancialTrendsCard";
import ExpenseByCategoryCard from "@/components/dashboard/ExpenseByCategoryCard";
import CategoryManagementCard from "@/components/dashboard/CategoryManagementCard";
import { loadCategoryWidgetPreferences, loadProductWidgetPreferences, loadWidgetVisibility, isWidgetVisible } from "@/lib/dashboard/preferences/service";
import UpcomingPaymentsCard from "@/components/dashboard/UpcomingPaymentsCard";
import { getCurrentCompanyId } from "@/lib/platform/organization";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';
import NetWorthWidget from "@/components/dashboard/NetWorthWidget";
import { loadUpcomingPayments } from "@/lib/dashboard/upcoming-payments";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { DASHBOARD_WIDGETS } from "@/lib/dashboard/preferences/shared";
import ProductManagementCard from "@/components/dashboard/ProductManagementCard";

const FINANCIAL_TRENDS_DEFAULT_MONTHS = 1;

export default async function DashboardPage() {
  const supabase = await createRSCClient();

  const overview = await loadDashboardOverview(8);
  const trendsOverview = await loadDashboardOverview(FINANCIAL_TRENDS_DEFAULT_MONTHS);
  const trendLabels = trendsOverview.trend.map((point) => point.label);
  const trendIncome = trendsOverview.trend.map((point) => point.income);
  const trendExpense = trendsOverview.trend.map((point) => point.expense);

  const breakdownTotal = overview.breakdown.reduce((sum, item) => sum + item.amount, 0);
  const budgets = await listBudgetsWithUsage();
  const categories = await listExpenseCategories();
  const upcomingPaymentsRaw = await loadUpcomingPayments(6);
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
  const productPrefs = await loadProductWidgetPreferences();
  const widgetVisibility = await loadWidgetVisibility();
  
  // Получаем текущего пользователя и компанию
  const { data: { user } } = await supabase.auth.getUser();
  const companyId = await getCurrentCompanyId();

  // Загружаем топ-товары за текущий месяц
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  
  let txQuery = supabase
    .from("transactions")
    .select("id")
    .gte("occurred_at", startOfMonth.toISOString())
    .lt("occurred_at", startOfNextMonth.toISOString());

  if (companyId) {
    txQuery = txQuery.eq("company_id", companyId);
  }

  const { data: transactionsForProducts } = await txQuery;

  const transactionIds = (transactionsForProducts || []).map((t) => t.id);
  
  type ProductItemRow = {
    name: string;
    quantity: number;
    unit: string;
    total_amount: number;
    transaction_id: string;
  };

  let topProducts: Array<{
    name: string;
    quantity: number;
    unit: string;
    totalAmount: number;
    transactionCount: number;
  }> = [];

  if (transactionIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("transaction_items")
      .select("name, quantity, unit, total_amount, transaction_id")
      .in("transaction_id", transactionIds);

    if (itemsData && itemsData.length > 0) {
      const productMap = new Map<string, {
        totalQuantity: number;
        unit: string;
        totalAmount: number;
        transactionIds: Set<string>;
      }>();

      (itemsData as ProductItemRow[]).forEach((item) => {
        if (!productMap.has(item.name)) {
          productMap.set(item.name, {
            totalQuantity: 0,
            unit: item.unit,
            totalAmount: 0,
            transactionIds: new Set(),
          });
        }
        const productData = productMap.get(item.name)!;
        productData.totalQuantity += item.quantity;
        productData.totalAmount += item.total_amount / 100;
        productData.transactionIds.add(item.transaction_id);
      });

      topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({
          name,
          quantity: data.totalQuantity,
          unit: data.unit,
          totalAmount: data.totalAmount,
          transactionCount: data.transactionIds.size,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5); // топ-5 товаров
    }
  }

  
  // Загружаем порядок виджетов из настроек
  const { data: dashboardSettings } = await supabase
    .from("user_dashboard_settings")
    .select("widget_layout")
    .eq("user_id", user?.id || "")
    .single();
  
  // Создаём порядок виджетов (если настроек нет, используем дефолтный)
  const widgetOrder = dashboardSettings?.widget_layout?.map((w: { id: string }) => w.id) || [
    DASHBOARD_WIDGETS.BUDGET,
    DASHBOARD_WIDGETS.FINANCIAL_TRENDS,
    DASHBOARD_WIDGETS.EXPENSE_BY_CATEGORY,
    DASHBOARD_WIDGETS.TOP_PRODUCTS,
    DASHBOARD_WIDGETS.NET_WORTH,
    DASHBOARD_WIDGETS.UPCOMING_PAYMENTS,
    DASHBOARD_WIDGETS.CATEGORY_MANAGEMENT,
  ];

  // Загружаем счета пользователя из базы
  let accountsQuery = supabase
    .from("accounts")
    .select("id,name,balance,currency,type,credit_limit")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (companyId) {
    accountsQuery = accountsQuery.eq("company_id", companyId);
  }

  const { data: accountsRaw = [] } = await accountsQuery;

  // Загружаем кредиты
  let loansQuery = supabase
    .from("loans")
    .select("id,name,principal_amount,principal_paid,currency,status")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (companyId) {
    loansQuery = loansQuery.eq("company_id", companyId);
  }

  const { data: loansRaw = [] } = await loansQuery;

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

  // Создаём мапу виджетов для динамического рендеринга
  const widgetComponents: Record<string, React.ReactNode> = {
    [DASHBOARD_WIDGETS.BUDGET]: isWidgetVisible(DASHBOARD_WIDGETS.BUDGET, widgetVisibility) && (
      <BudgetSection key="budget" budgets={budgets} currency={overview.currency} categories={categories} />
    ),
    [DASHBOARD_WIDGETS.FINANCIAL_TRENDS]: isWidgetVisible(DASHBOARD_WIDGETS.FINANCIAL_TRENDS, widgetVisibility) && (
      <div key="financial-trends" data-tour="dashboard-chart">
        <FinancialTrendsCard
          labels={trendLabels}
          income={trendIncome}
          expense={trendExpense}
          currency={trendsOverview.currency}
          initialMonths={FINANCIAL_TRENDS_DEFAULT_MONTHS}
        />
      </div>
    ),
    [DASHBOARD_WIDGETS.EXPENSE_BY_CATEGORY]: isWidgetVisible(DASHBOARD_WIDGETS.EXPENSE_BY_CATEGORY, widgetVisibility) && (
      <div key="expense-by-category" data-tour="dashboard-categories">
        <ExpenseByCategoryCard
          breakdown={overview.breakdown}
          total={breakdownTotal}
          currency={overview.currency}
        />
      </div>
    ),
    [DASHBOARD_WIDGETS.NET_WORTH]: isWidgetVisible(DASHBOARD_WIDGETS.NET_WORTH, widgetVisibility) && (
      <NetWorthWidget
        key="net-worth"
        accounts={accountGroups}
        totalAssets={totalAssets}
        totalDebts={totalDebts}
        currency={overview.currency}
      />
    ),
    [DASHBOARD_WIDGETS.UPCOMING_PAYMENTS]: isWidgetVisible(DASHBOARD_WIDGETS.UPCOMING_PAYMENTS, widgetVisibility) && (
      <UpcomingPaymentsCard key="upcoming-payments" payments={upcomingPayments} />
    ),
    [DASHBOARD_WIDGETS.CATEGORY_MANAGEMENT]: isWidgetVisible(DASHBOARD_WIDGETS.CATEGORY_MANAGEMENT, widgetVisibility) && (
      <CategoryManagementCard
        key="category-management"
        initialData={categorySummary}
        initialPreferences={prefs}
      />
    ),
    [DASHBOARD_WIDGETS.TOP_PRODUCTS]: isWidgetVisible(DASHBOARD_WIDGETS.TOP_PRODUCTS, widgetVisibility) && (
      <ProductManagementCard
        key="top-products"
        allProducts={topProducts}
        visibleProducts={productPrefs.visibleProducts}
        currency={overview.currency}
        from={startOfMonth.toISOString()}
        to={startOfNextMonth.toISOString()}
      />
    ),
  };

  return (
    <DashboardClient widgetVisibility={widgetVisibility}>
      <section className={styles.summaryGrid} data-tour="dashboard-summary">
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

      {/* Рендерим виджеты в порядке из настроек */}
      {widgetOrder.map((widgetId: string) => widgetComponents[widgetId]).filter(Boolean)}
    </DashboardClient>
  );
}
