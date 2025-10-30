import { createRSCClient } from "@/lib/supabase/helpers";
import { formatMoney } from "@/lib/utils/format";
import styles from "@/components/transactions/Transactions.module.css";
// Charts temporarily removed per design update
// ExpenseStructure removed; using ExpenseDoughnut below transactions instead
import AddTransactionButton from "./txn/AddTransactionButton";
import TransferButton from "./txn/TransferButton";
import SummaryWithPeriod from "@/components/transactions/SummaryWithPeriod";
import TransactionsGroupedList, { type Txn as GroupTxn } from "@/components/transactions/TransactionsGroupedList";
import FiltersAndSearch from "@/components/transactions/FiltersAndSearch";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';
import { listTransactions } from "@/lib/transactions/service";
import ImportCsvTrigger from "@/components/transactions/ImportCsvTrigger";
import ExportCsvButton from "@/components/transactions/ExportCsvButton";

type Account = { id: string; name: string; currency: string; balance: number; type: string; credit_limit: number | null };
type Category = { id: string; name: string; kind: "income" | "expense" | "transfer" | "both" };
type Txn = GroupTxn;

// removed lastMonths helper (no longer used)

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createRSCClient();

  // Загружаем счета (карты, наличные и т.д.)
  const { data: accountsData = [] } = await supabase
    .from("accounts")
    .select("id,name,currency,balance,type,credit_limit")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  // Загружаем кредиты
  const { data: loansData = [] } = await supabase
    .from("loans")
    .select("id,name,bank,principal_amount,principal_paid,currency")
    .is("deleted_at", null)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  // Объединяем счета и кредиты в один массив
  const accounts: Account[] = [
    ...(accountsData || []).map((acc) => ({
      id: acc.id,
      name: acc.name,
      currency: acc.currency || "RUB",
      balance: acc.balance || 0,
      type: acc.type || "other",
      credit_limit: acc.credit_limit,
    })),
    ...(loansData || []).map((loan) => ({
      id: loan.id,
      name: `${loan.name} (${loan.bank})`,
      currency: loan.currency || "RUB",
      balance: -(loan.principal_amount - loan.principal_paid), // Отрицательный баланс для кредитов
      type: "loan" as string,
      credit_limit: null,
    })),
  ];

  const { data: categories = [] } = await supabase
    .from("categories")
    .select("id,name,kind")
    .order("name", { ascending: true });

  // Parse filters from URL
  const sp = await searchParams;
  const qp = (k: string) => {
    const v = sp?.[k];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  };
  const f_q = qp("q") || "";
  const f_period = qp("period") || "current-month"; // current-month | prev-month | current-quarter | current-year | custom
  const f_type = qp("type") || "all"; // all | income | expense
  const f_categories = qp("categories") || ""; // comma-separated ids
  const f_accounts = qp("accounts") || "";   // comma-separated ids
  const f_min = qp("min") || ""; // major units
  const f_max = qp("max") || ""; // major units
  const f_from = qp("from") || ""; // YYYY-MM-DD
  const f_to = qp("to") || "";   // YYYY-MM-DD
  // Summary (top) custom period params
  const s_period = (qp("s_period") || "month").toString(); // month|prev|year|custom
  const s_from = qp("s_from") || "";
  const s_to = qp("s_to") || "";

  // Compute period range (UTC, inclusive end)
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const startCurrentMonth = new Date(Date.UTC(y, m, 1));
  const startPrevMonth = new Date(Date.UTC(y, m - 1, 1));
  const startNextMonthList = new Date(Date.UTC(y, m + 1, 1));
  const endCurrentMonth = new Date(startNextMonthList.getTime() - 1);
  const startCurrentYear = new Date(Date.UTC(y, 0, 1));
  const startNextYearList = new Date(Date.UTC(y + 1, 0, 1));
  const endCurrentYear = new Date(startNextYearList.getTime() - 1);

  let fromISO: string | undefined;
  let toISO: string | undefined;
  if (f_period === "current-month") {
    fromISO = startCurrentMonth.toISOString();
    toISO = endCurrentMonth.toISOString();
  } else if (f_period === "prev-month") {
    fromISO = startPrevMonth.toISOString();
    toISO = new Date(startCurrentMonth.getTime() - 1).toISOString();
  } else if (f_period === "current-quarter") {
    const qIndex = Math.floor(m / 3); // 0..3
    const startQuarter = new Date(Date.UTC(y, qIndex * 3, 1));
    const endQuarter = new Date(Date.UTC(y, qIndex * 3 + 3, 1) - 1);
    fromISO = startQuarter.toISOString();
    toISO = endQuarter.toISOString();
  } else if (f_period === "current-year") {
    fromISO = startCurrentYear.toISOString();
    toISO = endCurrentYear.toISOString();
  } else if (f_period === "custom") {
    if (f_from) {
      const [fy, fm, fd] = f_from.split("-").map((x) => parseInt(x, 10));
      if (!Number.isNaN(fy) && !Number.isNaN(fm) && !Number.isNaN(fd)) {
        fromISO = new Date(Date.UTC(fy, (fm - 1) || 0, fd || 1, 0, 0, 0, 0)).toISOString();
      }
    }
    if (f_to) {
      const [ty, tm, td] = f_to.split("-").map((x) => parseInt(x, 10));
      if (!Number.isNaN(ty) && !Number.isNaN(tm) && !Number.isNaN(td)) {
        const toEnd = new Date(Date.UTC(ty, (tm - 1) || 0, td || 1, 23, 59, 59, 999));
        toISO = toEnd.toISOString();
      }
    }
  }

  const cats = f_categories.split(",").filter(Boolean);
  const accts = f_accounts.split(",").filter(Boolean);
  const minVal = parseFloat(f_min);
  const maxVal = parseFloat(f_max);
  const hasMin = !Number.isNaN(minVal) && minVal > 0;
  const hasMax = !Number.isNaN(maxVal) && maxVal > 0;

  const txnList = await listTransactions(
    {
      limit: 500,
      direction: f_type === "income" || f_type === "expense" ? (f_type as "income" | "expense") : "all",
      accountIds: accts.length > 0 ? accts : undefined,
      categoryIds: cats.length > 0 ? cats : undefined,
      search: f_q || undefined,
      minAmountMajor: hasMin ? minVal : undefined,
      maxAmountMajor: hasMax ? maxVal : undefined,
      from: fromISO,
      to: toISO,
      orderBy: "occurred_at",
      orderDir: "desc",
    },
    { withCount: true }
  );

  const txns: Txn[] = txnList.data.map((t) => ({
    id: t.id,
    occurred_at: t.occurred_at,
    amount: t.amount,
    currency: t.currency,
    direction: t.direction,
    note: t.note,
    counterparty: t.counterparty,
    category_id: t.category_id,
    account_id: t.account_id,
    tags: t.tags,
    attachment_count: t.attachment_count,
    transfer_id: t.transfer_id,
    transfer_role: t.transfer_role,
    transfer_from_account_id: t.transfer_from_account_id,
    transfer_to_account_id: t.transfer_to_account_id,
  }));

  const hasAccount = (accounts?.length ?? 0) > 0;

  // Expense structure donut uses monthly data (chart) moved below transactions

  const firstDayThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const firstDayPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const firstDayThisYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const { data: txnsForCharts = [] } = await supabase
    .from("transactions")
    .select("id,occurred_at,amount,currency,direction,category_id,account_id,counterparty")
    .gte("occurred_at", new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)).toISOString())
    .order("occurred_at", { ascending: true })
    .limit(5000);

  type TxnWithRefs = Txn & { category_id: string | null; account_id: string };
  const txc = (txnsForCharts as unknown as TxnWithRefs[]) || [];

  // Accounts delta map for current month (minor) - keep for accounts widget
  const accountDeltaMinor = new Map<string, number>();
  for (const t of txc) {
    const d = new Date(t.occurred_at);
    if (d >= firstDayThisMonth) {
      if (t.direction === "income") accountDeltaMinor.set(t.account_id, (accountDeltaMinor.get(t.account_id) || 0) + Number(t.amount));
      else if (t.direction === "expense") accountDeltaMinor.set(t.account_id, (accountDeltaMinor.get(t.account_id) || 0) - Number(t.amount));
    }
  }

  // We'll compute chart ranges and series AFTER summary presets below

  // Build summary presets (only for summary cards)
  const currencyCode = (accounts?.[0]?.currency as string) || "RUB";
  // Inclusive period: from <= d <= toInclusive
  function sumRange(from: Date, toInclusive: Date) {
    let inc = 0;
    let exp = 0;
    for (const t of txc) {
      const d = new Date(t.occurred_at);
      if (d >= from && d <= toInclusive) {
        if (t.direction === "income") inc += Number(t.amount);
        else if (t.direction === "expense") {
          exp += Number(t.amount);
        }
      }
    }
    return { incomeMinor: inc, expenseMinor: exp };
  }
  function previousPeriod(from: Date, toInclusive: Date) {
    // Previous interval of identical length ending right before 'from'
    const duration = toInclusive.getTime() - from.getTime() + 1;
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - duration + 1);
    return { prevFrom, prevTo };
  }
  const startThisYear = firstDayThisYear;
  const startNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const startNextYear = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
  const endThisMonth = new Date(startNextMonth.getTime() - 1);
  const endPrevMonth = new Date(firstDayThisMonth.getTime() - 1);
  const endThisYear = new Date(startNextYear.getTime() - 1);

  function makePreset(from: Date, to: Date, key: string, label: string) {
    const cur = sumRange(from, to);
    const { prevFrom, prevTo } = previousPeriod(from, to);
    const prev = sumRange(prevFrom, prevTo);
    return {
      ...cur,
      prevIncomeMinor: prev.incomeMinor,
      prevExpenseMinor: prev.expenseMinor,
      key,
      label,
      currency: currencyCode,
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }

  const presetMonth = makePreset(firstDayThisMonth, endThisMonth, "month", "Этот месяц");
  const presetPrev = makePreset(firstDayPrevMonth, endPrevMonth, "prev", "Прошлый месяц");
  const presetYear = makePreset(startThisYear, endThisYear, "year", "Этот год");
  const summaryPresetsBase = [presetMonth, presetPrev, presetYear];
  let summaryPresets = summaryPresetsBase;
  let summaryDefaultKey: string = "month";
  if (s_period === "prev") summaryDefaultKey = "prev";
  else if (s_period === "year") summaryDefaultKey = "year";
  else if (s_period === "custom") {
    if (s_from && s_to) {
      const [fy, fm, fd] = s_from.split("-").map((x) => parseInt(x, 10));
      const [ty, tm, td] = s_to.split("-").map((x) => parseInt(x, 10));
      if (!Number.isNaN(fy) && !Number.isNaN(fm) && !Number.isNaN(fd) && !Number.isNaN(ty) && !Number.isNaN(tm) && !Number.isNaN(td)) {
        const fromD = new Date(Date.UTC(fy, fm - 1, fd, 0, 0, 0, 0));
        const toD = new Date(Date.UTC(ty, tm - 1, td, 23, 59, 59, 999));
        const customPreset = makePreset(fromD, toD, "custom", "Произвольный период");
        summaryPresets = [customPreset, ...summaryPresetsBase];
        summaryDefaultKey = "custom";
      }
    }
  }

  // Charts and expense analytics removed per design update

  return (
    <div>
      <div className={styles.topBar}>
        <div className={styles.pageTitle}>Транзакции</div>
        <div className={styles.topActions}>
          <ImportCsvTrigger className={styles.topBtn} />
          <ExportCsvButton
            className={styles.topBtn}
            searchParams={{
              q: f_q,
              period: f_period,
              type: f_type,
              categories: f_categories,
              accounts: f_accounts,
              min: f_min,
              max: f_max,
              from: f_from,
              to: f_to,
            }}
          />
          {(accounts as Account[]).length >= 2 && <TransferButton accounts={accounts as Account[]} />}
          <AddTransactionButton accounts={accounts as Account[]} categories={categories as Category[]} />
        </div>
      </div>

      {/* Accounts widget at top (как в дизайне) */}
      {hasAccount && (
        <section className={styles.accounts}>
          {(accounts as Account[]).slice(0, 3).map((a) => {
            // Используем баланс напрямую из БД (balance уже актуальный)
            const currentBalance = a.balance ?? 0;
            return (
              <div key={a.id} className={styles.accountCard}>
                <div className={styles.accountName}>{a.name}</div>
                <div className={styles.accountBalance}>{formatMoney(currentBalance, a.currency)}</div>
              </div>
            );
          })}
        </section>
      )}

      {/* Период + Summary (меняется только сводка) */}
      <SummaryWithPeriod presets={summaryPresets} defaultKey={summaryDefaultKey} />

      {/* Filters and search (как в дизайне) */}
      <FiltersAndSearch
        accounts={accounts as Account[]}
        categories={categories as Category[]}
        initial={{
          q: f_q,
          period: f_period,
          type: f_type,
          categories: f_categories,
          accounts: f_accounts,
          min: f_min,
          max: f_max,
          from: f_from,
          to: f_to,
        }}
      />

      {/* Форма добавления открывается в модальном окне по кнопке вверху */}

      <section className={styles.listCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 500 }}>Транзакции</div>
        </div>
        <div className={styles.list}>
          <TransactionsGroupedList txns={txns as Txn[]} categories={categories as Category[]} accounts={accounts as Account[]} />
          {((txns as Txn[]) ?? []).length === 0 && (
            <div style={{ color: "#888", display: "flex", alignItems: "center", gap: 10 }}>
              <span>Ничего не найдено по текущим фильтрам.</span>
              <a className={styles.lightBtn} href="/transactions" style={{ textDecoration: "none" }}>Сбросить фильтры</a>
            </div>
          )}
        </div>
      </section>

      <section className={styles.analyticsSection}>
        <div className={`${styles.analyticsGrid} ${styles.two}`}>
          <div className={styles.analyticsCard}>
            <span className={styles.analyticsBadge}>Временные тренды</span>
            <div className={styles.analyticsTitle}>Категории: динамика и сравнение</div>
            <div className={styles.analyticsPlaceholder}>
              <strong>Сравнение с прошлым периодом</strong>
              <span>Здесь появятся проценты роста/падения и суммы по категориям, как только подключим API.</span>
            </div>
            <div className={styles.analyticsPlaceholder}>
              <strong>Мини-графики (sparklines)</strong>
              <span>В планах отрисовать тренды по месяцам для каждой категории.</span>
            </div>
          </div>
          <div className={styles.analyticsCard}>
            <span className={styles.analyticsBadge}>Бюджетный контроль</span>
            <div className={styles.analyticsTitle}>Лимиты и прогноз</div>
            <div className={styles.analyticsPlaceholder}>
              <strong>Превышения бюджета</strong>
              <span>Отображение категорий, превысивших лимит.</span>
            </div>
            <div className={styles.analyticsPlaceholder}>
              <strong>Остаток до лимита</strong>
              <span>Процент и сумма до достижения лимита.</span>
            </div>
            <div className={styles.analyticsPlaceholder}>
              <strong>Прогноз расходов</strong>
              <span>Прогноз на конец текущего периода.</span>
            </div>
          </div>
        </div>

        <div className={`${styles.analyticsGrid} ${styles.three}`} style={{ marginTop: 20 }}>
          <div className={styles.analyticsCard}>
            <span className={styles.analyticsBadge}>Финансовое здоровье</span>
            <div className={styles.analyticsTitle}>Ключевые коэффициенты</div>
            <div className={styles.analyticsPlaceholder}>
              <strong>Коэффициент накоплений</strong>
              <span>Рассчитаем (доходы - расходы) / доходы по периодам.</span>
            </div>
            <div className={styles.analyticsPlaceholder}>
              <strong>Индекс разнообразия трат</strong>
              <span>Подсчёт распределения расходов по категориям.</span>
            </div>
            <div className={styles.analyticsPlaceholder}>
              <strong>Стабильность расходов</strong>
              <span>Отклонение от среднемесячных трат.</span>
            </div>
          </div>

          <div className={styles.analyticsCard}>
            <span className={styles.analyticsBadge}>Цели и достижения</span>
            <div className={styles.analyticsTitle}>Прогресс и рекорды</div>
            <div className={styles.analyticsPlaceholder}>
              <strong>Прогресс по целям</strong>
              <span>Покажем процент выполнения целей экономии.</span>
            </div>
            <div className={styles.analyticsPlaceholder}>
              <strong>Рекорды</strong>
              <span>Самый экономный месяц и категория с большими сокращениями.</span>
            </div>
          </div>

          <div className={styles.analyticsCard}>
            <span className={styles.analyticsBadge}>AI рекомендации</span>
            <div className={styles.analyticsTitle}>Что можно улучшить</div>
            <div className={styles.analyticsPlaceholder}>
              <strong>Персональные рекомендации</strong>
              <span>Здесь появятся советы, например «Сократите траты на категорию Х на 10%».</span>
            </div>
            <div className={styles.analyticsPlaceholder}>
              <strong>Следующие шаги</strong>
              <span>Автоматически сформируем действия после связи с AI API.</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
