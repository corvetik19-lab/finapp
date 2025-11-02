import styles from "@/components/budgets/Budgets.module.css";
import { createRSCClient } from "@/lib/supabase/helpers";
import { listBudgetsWithUsage } from "@/lib/budgets/service";
import { formatMoney } from "@/lib/utils/format";
import { createBudget } from "./actions";
import BudgetsList from "@/components/budgets/BudgetsList";
import BudgetForm from "@/components/budgets/BudgetForm";
import SavingsDistribution from "@/components/budgets/SavingsDistribution";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

export default async function BudgetsPage() {
  const supabase = await createRSCClient();

  // Загружаем категории доходов, расходов и "both" (доход+расход)
  const { data: categoriesRaw } = await supabase
    .from("categories")
    .select("id,name,kind")
    .in("kind", ["income", "expense", "both"])
    .order("kind", { ascending: false })
    .order("name", { ascending: true });

  const categories = (categoriesRaw ?? []) as { id: string; name: string; kind: "income" | "expense" | "transfer" | "both" }[];

  // Загружаем кредитные карты (карты с лимитом)
  const { data: accountsRaw } = await supabase
    .from("accounts")
    .select("id,name,type")
    .eq("type", "card")
    .not("credit_limit", "is", null)
    .eq("archived", false)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  const creditCards = (accountsRaw ?? []) as { id: string; name: string; type: string }[];

  // Загружаем дебетовые карты для распределения экономии (без balance из-за RLS)
  const { data: debitAccountsRaw, error: debitError } = await supabase
    .from("accounts")
    .select("id,name,type,credit_limit")
    .eq("type", "card")
    .eq("archived", false)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (debitError) {
    console.error("Error loading debit cards:", debitError);
  }

  // Фильтруем только дебетовые карты (без кредитного лимита) и добавляем balance = 0
  const debitCards = (debitAccountsRaw ?? [])
    .filter((card: { id: string; name: string; type: string; credit_limit: number | null }) => card.credit_limit === null)
    .map((card: { id: string; name: string; type: string }) => ({
      id: card.id,
      name: card.name,
      type: card.type,
      balance: 0
    })) as { id: string; name: string; type: string; balance: number }[];

  const budgets = await listBudgetsWithUsage();

  // Загружаем сохраненные распределения экономии для текущего месяца
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const { data: savedDistributions } = await supabase
    .from("savings_distributions")
    .select("account_id, amount")
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd);

  const initialDistributions = savedDistributions || [];
  
  // Фильтруем категории и счета - убираем те, для которых уже есть бюджет
  const usedCategoryIds = new Set(budgets.map(b => b.category_id).filter(Boolean));
  const usedAccountIds = new Set(budgets.map(b => b.account_id).filter(Boolean));
  
  // Доступные кредитные карты (без бюджета)
  const availableCreditCards = creditCards.filter(card => !usedAccountIds.has(card.id));
  
  // Категории с kind='both' - это категории для чистой прибыли (доход - расход)
  const bothCategories = categories.filter(c => c.kind === "both");
  
  // Фильтруем - убираем те, для которых уже есть бюджет
  const netProfitCategories = bothCategories
    .filter(c => !usedCategoryIds.has(c.id))
    .map(c => ({
      name: c.name,
      categoryId: c.id,
      displayId: `net_${c.id}` // Специальный ID для чистой прибыли
    }));
  
  console.log("Both categories (net profit):", bothCategories.map(c => c.name));
  console.log("Net profit categories (available):", netProfitCategories);
  
  // ID категорий с kind='both' - они не должны попадать в обычные списки
  const bothCategoryIds = new Set(bothCategories.map(c => c.id));
  
  // Фильтруем категории - только income и expense, убираем использованные и 'both'
  const availableCategories = categories.filter(c => 
    (c.kind === "income" || c.kind === "expense") && 
    !usedCategoryIds.has(c.id) && 
    !bothCategoryIds.has(c.id)
  );

  // Разделяем бюджеты на доходы (включая both/чистую прибыль) и расходы
  const incomeBudgets = budgets.filter(b => b.category?.kind === "income" || b.category?.kind === "both");
  const expenseBudgets = budgets.filter(b => b.category?.kind === "expense" || b.account_id); // Кредитные карты тоже расходы

  // Считаем суммы по доходам
  const totalIncomeLimitMinor = incomeBudgets.reduce((acc, b) => acc + b.limit_minor, 0);
  const totalIncomeActualMinor = incomeBudgets.reduce((acc, b) => acc + b.spent_minor, 0);

  // Считаем суммы по расходам
  const totalExpenseLimitMinor = expenseBudgets.reduce((acc, b) => acc + b.limit_minor, 0);
  const totalExpenseSpentMinor = expenseBudgets.reduce((acc, b) => acc + b.spent_minor, 0);

  // Баланс бюджета (планируемая экономия)
  const budgetBalanceMinor = totalIncomeLimitMinor - totalExpenseLimitMinor;
  const actualBalanceMinor = totalIncomeActualMinor - totalExpenseSpentMinor;

  // Процент покрытия расходов доходами
  const coveragePercent = totalIncomeLimitMinor > 0 
    ? Math.round((totalExpenseLimitMinor / totalIncomeLimitMinor) * 100) 
    : 0;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.pageTitle}>Бюджеты</div>
      </div>

      <section className={styles.summaryGrid}>
        <div className={`${styles.summaryCard} ${styles.incomeCard}`}>
          <div className={styles.summaryIcon}>
            <span className="material-icons">trending_up</span>
          </div>
          <div className={styles.summaryLabel}>💰 Плановые доходы</div>
          <div className={styles.summaryValue}>{formatMoney(totalIncomeLimitMinor, "RUB")}</div>
          <div className={styles.summaryMeta}>Получено: {formatMoney(totalIncomeActualMinor, "RUB")}</div>
        </div>
        
        <div className={`${styles.summaryCard} ${styles.expenseCard}`}>
          <div className={styles.summaryIcon}>
            <span className="material-icons">trending_down</span>
          </div>
          <div className={styles.summaryLabel}>💸 Плановые расходы</div>
          <div className={styles.summaryValue}>{formatMoney(totalExpenseLimitMinor, "RUB")}</div>
          <div className={styles.summaryMeta}>Потрачено: {formatMoney(totalExpenseSpentMinor, "RUB")}</div>
        </div>
        
        <div className={`${styles.summaryCard} ${styles.balanceCard}`}>
          <div className={styles.summaryIcon}>
            <span className="material-icons">account_balance_wallet</span>
          </div>
          <div className={styles.summaryLabel}>💵 Планируемая экономия</div>
          <div className={styles.summaryValue} style={{ color: budgetBalanceMinor >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatMoney(budgetBalanceMinor, "RUB")}
          </div>
          <div className={styles.summaryMeta}>Фактическая: {formatMoney(actualBalanceMinor, "RUB")}</div>
        </div>
        
        <div className={`${styles.summaryCard} ${styles.coverageCard}`}>
          <div className={styles.summaryIcon}>
            <span className="material-icons">pie_chart</span>
          </div>
          <div className={styles.summaryLabel}>📊 Покрытие расходов</div>
          <div className={styles.summaryValue} style={{ color: coveragePercent <= 100 ? 'var(--success)' : 'var(--danger)' }}>
            {coveragePercent}%
          </div>
          <div className={styles.summaryMeta}>
            {coveragePercent <= 100 
              ? `✓ Доходы покрывают расходы` 
              : `⚠️ Расходы превышают доходы на ${coveragePercent - 100}%`}
          </div>
        </div>
        
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <span className="material-icons">list_alt</span>
          </div>
          <div className={styles.summaryLabel}>📋 Всего бюджетов</div>
          <div className={styles.summaryValue}>{budgets.length}</div>
          <div className={styles.summaryMeta}>Доходы: {incomeBudgets.length} | Расходы: {expenseBudgets.length}</div>
        </div>
        
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <span className="material-icons">update</span>
          </div>
          <div className={styles.summaryLabel}>⏳ Остаток бюджета</div>
          <div className={styles.summaryValue}>{formatMoney(actualBalanceMinor, "RUB")}</div>
          <div className={styles.summaryMeta}>Фактический остаток (получено - потрачено)</div>
        </div>
      </section>

      <BudgetForm 
        categories={availableCategories} 
        netProfitCategories={netProfitCategories}
        creditCards={availableCreditCards}
        onSubmit={createBudget} 
      />

      <SavingsDistribution 
        totalSavings={budgetBalanceMinor}
        debitCards={debitCards}
        initialDistributions={initialDistributions}
      />

      <section className={styles.list}>
        <BudgetsList budgets={budgets} categories={categories} />
      </section>
    </div>
  );
}
