import { Suspense } from "react";
import { createRSCClient } from "@/lib/supabase/helpers";
import { listTransactions, type TransactionRecord } from "@/lib/transactions/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AddTransactionButton from "./txn/AddTransactionButton";
import TransferButton from "./txn/TransferButton";
import QuickTransactionButton from "@/components/transactions/QuickTransactionButton";
import SummaryWithPeriod from "@/components/transactions/SummaryWithPeriod";
import FiltersAndSearch from "@/components/transactions/FiltersAndSearch";
import AccountsSection from "@/components/transactions/AccountsSection";
import ImportCsvTrigger from "@/components/transactions/ImportCsvTrigger";
import BankImportTrigger from "@/components/transactions/BankImportTrigger";
import ExportCsvButton from "@/components/transactions/ExportCsvButton";
import ClientPaginatedList from "@/components/transactions/ClientPaginatedList";
import { type Txn as GroupTxn } from "@/components/transactions/TransactionsGroupedList";
import { getCurrentCompanyId } from "@/lib/platform/organization";

type Account = { id: string; name: string; currency: string; balance: number; type: string; credit_limit: number | null };
type Category = { id: string; name: string; kind: "income" | "expense" | "transfer" | "both" };
type Txn = GroupTxn;

// Отключаем кеширование для мгновенного обновления после добавления транзакций
export const dynamic = 'force-dynamic';

// removed lastMonths helper (no longer used)

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  // Загружаем счета (карты, наличные и т.д.)
  let accountsQuery = supabase
    .from("accounts")
    .select("id,name,currency,balance,type,credit_limit")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (companyId) {
    accountsQuery = accountsQuery.eq("company_id", companyId);
  }

  const { data: accountsData = [] } = await accountsQuery;

  // Загружаем кредиты
  let loansQuery = supabase
    .from("loans")
    .select("id,name,bank,principal_amount,principal_paid,currency")
    .is("deleted_at", null)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (companyId) {
    loansQuery = loansQuery.eq("company_id", companyId);
  }

  const { data: loansData = [] } = await loansQuery;

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

  let categoriesQuery = supabase
    .from("categories")
    .select("id,name,kind")
    .order("name", { ascending: true });

  if (companyId) {
    categoriesQuery = categoriesQuery.eq("company_id", companyId);
  }

  const { data: categories = [] } = await categoriesQuery;

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
  const f_limit = qp("limit") || ""; // pagination limit
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

  // Вычисляем лимит для пагинации
  const isLargePeriod = f_period === 'current-year' || f_period === 'custom';
  const defaultLimit = isLargePeriod ? 50 : 100;
  const userLimit = f_limit ? parseInt(f_limit, 10) : 0;
  const effectiveLimit = userLimit > 0 ? userLimit : defaultLimit;

  let txnList;
  try {
    // console.log("📊 listTransactions params:", { from: fromISO, to: toISO, period: f_period, limit: effectiveLimit });
    
    txnList = await listTransactions(
      {
        limit: effectiveLimit,
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
  } catch (error) {
    console.error("Error in listTransactions:", error);
    throw error;
  }

  const txns: Txn[] = txnList.data.map((t: TransactionRecord) => ({
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

  // Загружаем ВСЕ транзакции для корректного расчёта сумм (без лимита)
  let txnsForChartsQuery = supabase
    .from("transactions")
    .select("id,occurred_at,amount,currency,direction,category_id,account_id,counterparty")
    .gte("occurred_at", new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)).toISOString())
    .order("occurred_at", { ascending: true });

  if (companyId) {
    txnsForChartsQuery = txnsForChartsQuery.eq("company_id", companyId);
  }

  const { data: txnsForCharts = [], error: chartsError } = await txnsForChartsQuery;

  if (chartsError) {
    console.error("Error fetching transactions for charts:", chartsError);
  }

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
        // Используем Math.abs для корректного подсчёта (в базе могут быть разные знаки)
        if (t.direction === "income") inc += Math.abs(Number(t.amount));
        else if (t.direction === "expense") {
          exp += Math.abs(Number(t.amount));
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Транзакции</h1>
          <p className="text-sm text-muted-foreground">История операций</p>
        </div>
        <div className="flex items-center gap-2">
          <BankImportTrigger />
          <ImportCsvTrigger />
          <ExportCsvButton
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
          {(accounts as Account[]).length >= 2 && (
            <Suspense fallback={<Button variant="secondary" size="sm" disabled>Перевод</Button>}>
              <TransferButton accounts={accounts as Account[]} />
            </Suspense>
          )}
          <QuickTransactionButton accounts={accounts as Account[]} />
          <AddTransactionButton accounts={accounts as Account[]} />
        </div>
      </div>

      {/* Accounts widget at top (как в дизайне) */}
      {hasAccount && <AccountsSection accounts={accounts as Account[]} />}

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

      {/* Transactions List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Транзакции</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientPaginatedList
            key={`txns-${txns.length}-${txns[0]?.id || 'empty'}`}
            initialTransactions={txns as Txn[]}
            initialCount={((txns as Txn[]) ?? []).length}
            totalCount={txnList.count ?? null}
            categories={categories as Category[]}
            accounts={accounts as Account[]}
            filters={{
              from: fromISO,
              to: toISO,
              direction: f_type,
              accountIds: accts,
              categoryIds: cats,
              search: f_q || undefined,
            }}
          />
        </CardContent>
      </Card>

      {/* Analytics Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Временные тренды</span>
            </div>
            <CardTitle className="text-base">Категории: динамика и сравнение</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div><strong className="text-foreground">Сравнение с прошлым периодом</strong><br/>Здесь появятся проценты роста/падения и суммы по категориям.</div>
            <div><strong className="text-foreground">Мини-графики (sparklines)</strong><br/>В планах отрисовать тренды по месяцам для каждой категории.</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Бюджетный контроль</span>
            </div>
            <CardTitle className="text-base">Лимиты и прогноз</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div><strong className="text-foreground">Превышения бюджета</strong><br/>Отображение категорий, превысивших лимит.</div>
            <div><strong className="text-foreground">Остаток до лимита</strong><br/>Процент и сумма до достижения лимита.</div>
            <div><strong className="text-foreground">Прогноз расходов</strong><br/>Прогноз на конец текущего периода.</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Финансовое здоровье</span>
            </div>
            <CardTitle className="text-base">Ключевые коэффициенты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div><strong className="text-foreground">Коэффициент накоплений</strong><br/>Рассчитаем (доходы - расходы) / доходы по периодам.</div>
            <div><strong className="text-foreground">Индекс разнообразия трат</strong><br/>Подсчёт распределения расходов по категориям.</div>
            <div><strong className="text-foreground">Стабильность расходов</strong><br/>Отклонение от среднемесячных трат.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Цели и достижения</span>
            </div>
            <CardTitle className="text-base">Прогресс и рекорды</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div><strong className="text-foreground">Прогресс по целям</strong><br/>Покажем процент выполнения целей экономии.</div>
            <div><strong className="text-foreground">Рекорды</strong><br/>Самый экономный месяц и категория с большими сокращениями.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">AI рекомендации</span>
            </div>
            <CardTitle className="text-base">Что можно улучшить</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div><strong className="text-foreground">Персональные рекомендации</strong><br/>Здесь появятся советы, например «Сократите траты на категорию Х на 10%».</div>
            <div><strong className="text-foreground">Следующие шаги</strong><br/>Автоматически сформируем действия после связи с AI API.</div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
