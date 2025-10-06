import { createRSCClient } from "@/lib/supabase/helpers";
import { aggregateReports } from "@/lib/reports/aggregations";
import { listBudgetsWithUsage } from "@/lib/budgets/service";
import MonthlyTrendChart from "@/components/reports/MonthlyTrendChart";
import ExpenseBreakdownDonut from "@/components/reports/ExpenseBreakdownDonut";
import styles from "@/components/reports/Reports.module.css";
import { formatMoney } from "@/lib/utils/format";

type CategoryRow = { id: string; name: string };

type ChartTransaction = {
  occurred_at: string;
  amount: number;
  currency: string;
  direction: "income" | "expense" | "transfer";
  category_id: string | null;
};

const getStartRangeISO = (now: Date) =>
  new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)).toISOString();

const toMinor = (major: number) => Math.round(major * 100);

const makeDeltaLabel = (valueMajor: number, formatter: (value: number) => string) => {
  if (valueMajor === 0) return "без изменений";
  const sign = valueMajor > 0 ? "+" : "";
  return `${sign}${formatter(valueMajor)}`;
};

export default async function ReportsPage() {
  const now = new Date();
  const supabase = await createRSCClient();

  const [{ data: txnData, error: txnError }, { data: catData, error: catError }] = await Promise.all([
    supabase
      .from("transactions")
      .select("occurred_at,amount,currency,direction,category_id")
      .gte("occurred_at", getStartRangeISO(now))
      .order("occurred_at", { ascending: true })
      .limit(1500),
    supabase.from("categories").select("id,name").order("name", { ascending: true }),
  ]);

  if (txnError) throw txnError;
  if (catError) throw catError;

  const transactions = (txnData ?? []) as ChartTransaction[];

  const categoryMap = Object.fromEntries((catData ?? []).map((cat: CategoryRow) => [cat.id, cat.name] as const));

  const budgets = await listBudgetsWithUsage();
  const today = new Date();
  const activeBudgets = budgets.filter((budget) => {
    const start = new Date(`${budget.period_start}T00:00:00Z`);
    const end = new Date(`${budget.period_end}T23:59:59Z`);
    return start <= today && end >= today;
  });
  const hasOverBudget = activeBudgets.some((budget) => budget.status === "over");
  const hasWarningBudget = activeBudgets.some((budget) => budget.status === "warning");
  const budgetStatusByCategory = new Map(
    activeBudgets
      .filter((budget) => budget.category)
      .map((budget) => [budget.category!.name, budget.status] as const)
  );

  if (transactions.length === 0) {
    return (
      <div className={styles.page}>
        <section className={styles.header}>
          <h1 className={styles.title}>Отчёты</h1>
          <p className={styles.subtitle}>
            Здесь появятся визуализации доходов и расходов. Добавьте транзакции, чтобы построить аналитику по периодам и категориям.
          </p>
        </section>

        <div className={styles.emptyState}>
          <strong>Недостаточно данных</strong>
          <span>Пока что в системе нет транзакций за последние 12 месяцев. Добавьте хотя бы одну запись, чтобы увидеть отчёты.</span>
        </div>
      </div>
    );
  }

  const report = aggregateReports(transactions, { categories: categoryMap, now });
  const { monthlyTrend, expenseBreakdown, currency, periodLabel } = report;

  const currentIndex = monthlyTrend.labels.length - 1;
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;

  const currentIncome = currentIndex >= 0 ? monthlyTrend.income[currentIndex] : 0;
  const currentExpense = currentIndex >= 0 ? monthlyTrend.expense[currentIndex] : 0;
  const currentNet = currentIncome - currentExpense;

  const prevIncome = prevIndex >= 0 ? monthlyTrend.income[prevIndex] : 0;
  const prevExpense = prevIndex >= 0 ? monthlyTrend.expense[prevIndex] : 0;
  const prevNet = prevIncome - prevExpense;

  const formatMajor = (valueMajor: number) => formatMoney(toMinor(valueMajor), currency);

  const incomeDeltaLabel = makeDeltaLabel(currentIncome - prevIncome, formatMajor);
  const expenseDeltaLabel = makeDeltaLabel(currentExpense - prevExpense, formatMajor);
  const netDeltaLabel = makeDeltaLabel(currentNet - prevNet, formatMajor);

  const breakdownTotal = expenseBreakdown.values.reduce((sum, value) => sum + value, 0);
  const hasBreakdown = expenseBreakdown.labels.length > 0 && breakdownTotal > 0;

  const expenseCardClasses = [styles.summaryCard, styles.expense];
  if (hasOverBudget) expenseCardClasses.push(styles.dangerAccent);
  else if (hasWarningBudget) expenseCardClasses.push(styles.warningAccent);

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h1 className={styles.title}>Отчёты</h1>
          <a
            href="/reports/custom"
            className={styles.createReportBtn}
          >
            <span className="material-icons" style={{ fontSize: '20px' }}>add_chart</span>
            Создать отчёт
          </a>
        </div>
        <p className={styles.subtitle}>
          Аналитика по доходам и расходам, структура затрат и динамика по периодам. Данные обновляются автоматически на основе ваших транзакций.
        </p>
      </section>

      <section className={styles.summary}>
        <div className={`${styles.summaryCard} ${styles.income}`}>
          <span className={styles.summaryLabel}>Доходы за {periodLabel}</span>
          <span className={styles.summaryValue}>{formatMajor(currentIncome)}</span>
          <span className={styles.summaryHint}>Изменение к прошлому месяцу: {incomeDeltaLabel}</span>
        </div>
        <div className={expenseCardClasses.join(" ")}>
          <span className={styles.summaryLabel}>Расходы за {periodLabel}</span>
          <span className={styles.summaryValue}>{formatMajor(currentExpense)}</span>
          <span className={styles.summaryHint}>Изменение к прошлому месяцу: {expenseDeltaLabel}</span>
          {(hasOverBudget || hasWarningBudget) && (
            <span
              className={`${styles.summaryHint} ${hasOverBudget ? styles.summaryHintAlert : styles.summaryHintNotice}`}
            >
              {hasOverBudget ? "Есть категории с превышенным бюджетом" : "Часть категорий близка к лимиту"}
            </span>
          )}
        </div>
        <div className={`${styles.summaryCard} ${styles.net}`}>
          <span className={styles.summaryLabel}>Чистый поток за {periodLabel}</span>
          <span className={styles.summaryValue}>{formatMajor(currentNet)}</span>
          <span className={styles.summaryHint}>Дельта к прошлому месяцу: {netDeltaLabel}</span>
        </div>
      </section>

      <section className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <div>
            <div className={styles.cardTitle}>Динамика доходов и расходов</div>
            <div className={styles.cardSubtitle}>Последние 12 месяцев</div>
          </div>
          <div className={styles.chartBody}>
            <MonthlyTrendChart
              labels={monthlyTrend.labels}
              income={monthlyTrend.income}
              expense={monthlyTrend.expense}
              currency={currency}
            />
          </div>
        </div>

        <div className={styles.chartCard}>
          <div>
            <div className={styles.cardTitle}>Структура расходов</div>
            <div className={styles.cardSubtitle}>Период: {periodLabel}</div>
          </div>
          <div className={styles.chartBody}>
            {hasBreakdown ? (
              <ExpenseBreakdownDonut
                labels={expenseBreakdown.labels}
                values={expenseBreakdown.values}
                currency={currency}
              />
            ) : (
              <div className={styles.emptyState}>
                <strong>Расходов недостаточно</strong>
                <span>В текущем месяце ещё нет расходов. Добавьте транзакции, чтобы увидеть разбивку по категориям.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {hasBreakdown && (
        <section className={styles.breakdownList}>
          <div className={styles.breakdownListTitle}>Топ категорий расходов — {periodLabel}</div>
          <div className={styles.breakdownItems}>
            {expenseBreakdown.labels.map((label, index) => {
              const valueMajor = expenseBreakdown.values[index];
              const pct = breakdownTotal > 0 ? (valueMajor / breakdownTotal) * 100 : 0;
              const budgetStatus = budgetStatusByCategory.get(label);
              const breakdownItemClasses = [styles.breakdownItem];
              if (budgetStatus === "over") breakdownItemClasses.push(styles.breakdownItemOver);
              else if (budgetStatus === "warning") breakdownItemClasses.push(styles.breakdownItemWarning);
              return (
                <div key={label} className={breakdownItemClasses.join(" ")}> 
                  <div className={styles.breakdownName}>
                    <span className={styles.breakdownLabel}>{label}</span>
                    <span className={styles.breakdownMeta}>{pct.toFixed(1)}% от расходов месяца</span>
                  </div>
                  <div className={styles.breakdownValueWrap}>
                    <span className={styles.breakdownValue}>{formatMajor(valueMajor)}</span>
                    {budgetStatus && (
                      <span
                        className={`${styles.breakdownStatusBadge} ${
                          budgetStatus === "over"
                            ? styles.breakdownStatusBadgeOver
                            : styles.breakdownStatusBadgeWarning
                        }`}
                      >
                        {budgetStatus === "over" ? "перерасход" : "почти лимит"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
