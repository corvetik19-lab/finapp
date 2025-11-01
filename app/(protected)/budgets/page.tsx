import styles from "@/components/budgets/Budgets.module.css";
import { createRSCClient } from "@/lib/supabase/helpers";
import { listBudgetsWithUsage } from "@/lib/budgets/service";
import { formatMoney } from "@/lib/utils/format";
import { createBudget } from "./actions";
import BudgetsList from "@/components/budgets/BudgetsList";
import BudgetForm from "@/components/budgets/BudgetForm";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

export default async function BudgetsPage() {
  const supabase = await createRSCClient();

  // Загружаем категории доходов и расходов
  const { data: categoriesRaw } = await supabase
    .from("categories")
    .select("id,name,kind")
    .in("kind", ["income", "expense"])
    .order("kind", { ascending: false }) // income сначала, потом expense
    .order("name", { ascending: true });

  const categories = (categoriesRaw ?? []) as { id: string; name: string; kind: "income" | "expense" | "transfer" }[];

  const budgets = await listBudgetsWithUsage();
  
  // Находим категории с одинаковыми именами в доходах и расходах
  const incomeCategories = categories.filter(c => c.kind === "income");
  const expenseCategories = categories.filter(c => c.kind === "expense");
  
  const netProfitCategories: Array<{ 
    name: string; 
    incomeId: string; 
    expenseId: string;
    displayId: string; // Используем для формы
  }> = [];
  
  incomeCategories.forEach(inc => {
    const matchingExpense = expenseCategories.find(exp => exp.name === inc.name);
    if (matchingExpense) {
      netProfitCategories.push({
        name: inc.name,
        incomeId: inc.id,
        expenseId: matchingExpense.id,
        displayId: `net_${inc.id}_${matchingExpense.id}` // Специальный ID для чистой прибыли
      });
    }
  });
  
  // Фильтруем категории - убираем те, для которых уже есть бюджет
  const usedCategoryIds = new Set(budgets.map(b => b.category_id).filter(Boolean));
  const availableCategories = categories.filter(c => !usedCategoryIds.has(c.id));

  // Разделяем бюджеты на доходы и расходы
  const incomeBudgets = budgets.filter(b => b.category?.kind === "income");
  const expenseBudgets = budgets.filter(b => b.category?.kind === "expense");

  // Считаем суммы по доходам
  const totalIncomeLimitMinor = incomeBudgets.reduce((acc, b) => acc + b.limit_minor, 0);
  const totalIncomeActualMinor = incomeBudgets.reduce((acc, b) => acc + b.spent_minor, 0);

  // Считаем суммы по расходам
  const totalExpenseLimitMinor = expenseBudgets.reduce((acc, b) => acc + b.limit_minor, 0);
  const totalExpenseSpentMinor = expenseBudgets.reduce((acc, b) => acc + b.spent_minor, 0);
  const totalExpenseRemainingMinor = totalExpenseLimitMinor - totalExpenseSpentMinor;

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
          <div className={styles.summaryValue}>{formatMoney(totalExpenseRemainingMinor, "RUB")}</div>
          <div className={styles.summaryMeta}>Доступно для расходов</div>
        </div>
      </section>

      <BudgetForm 
        categories={availableCategories} 
        netProfitCategories={netProfitCategories}
        onSubmit={createBudget} 
      />

      <section className={styles.list}>
        <BudgetsList budgets={budgets} categories={categories} />
      </section>
    </div>
  );
}
