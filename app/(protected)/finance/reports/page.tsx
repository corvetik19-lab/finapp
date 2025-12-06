import { createRSCClient } from "@/lib/supabase/helpers";
import { aggregateReports } from "@/lib/reports/aggregations";
import { listBudgetsWithUsage } from "@/lib/budgets/service";
import MonthlyTrendChart from "@/components/reports/MonthlyTrendChart";
import ExpenseBreakdownDonut from "@/components/reports/ExpenseBreakdownDonut";
import ProductBreakdownTable from "@/components/reports/ProductBreakdownTable";
import ExportButtons from "@/components/reports/ExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, AlertTriangle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils/format";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

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
      .select("occurred_at,amount,currency,direction,category_id,id")
      .gte("occurred_at", getStartRangeISO(now))
      .order("occurred_at", { ascending: true })
      .limit(1500),
    supabase.from("categories").select("id,name").is("deleted_at", null).order("name", { ascending: true }),
  ]);

  if (txnError) throw txnError;
  if (catError) throw catError;

  const transactions = (txnData ?? []) as ChartTransaction[];

  const categoryMap = Object.fromEntries((catData ?? []).map((cat: CategoryRow) => [cat.id, cat.name] as const));

  // Загружаем позиции товаров для транзакций
  const transactionIds = transactions.map((t) => (t as { id?: string }).id).filter(Boolean);
  const transactionItems: Array<{ name: string; quantity: number; unit: string; total_amount: number; occurred_at: string }> = [];
  
  if (transactionIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("transaction_items")
      .select("name, quantity, unit, total_amount, created_at")
      .in("transaction_id", transactionIds);
    
    if (itemsData) {
      transactionItems.push(...itemsData.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        total_amount: item.total_amount,
        occurred_at: item.created_at,
      })));
    }
  }

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
      <div className="p-6 space-y-6">
        <div><h1 className="text-2xl font-bold">Отчёты</h1><p className="text-muted-foreground">Здесь появятся визуализации. Добавьте транзакции.</p><ExportButtons /></div>
        <Card className="text-center py-8"><CardContent><p className="font-semibold">Недостаточно данных</p><p className="text-muted-foreground">Пока что в системе нет транзакций за последние 12 месяцев.</p></CardContent></Card>
      </div>
    );
  }

  const report = aggregateReports(transactions, { 
    categories: categoryMap, 
    items: transactionItems,
    now 
  });
  const { monthlyTrend, expenseBreakdown, productBreakdown, currency, periodLabel } = report;

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Отчёты</h1><p className="text-muted-foreground">Аналитика по доходам и расходам</p></div>
        <Link href="/finance/reports/custom"><Button><PlusCircle className="h-4 w-4 mr-1" />Создать отчёт</Button></Link>
      </div>
      <ExportButtons />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Доходы за {periodLabel}</p><p className="text-2xl font-bold text-green-600">{formatMajor(currentIncome)}</p><p className="text-xs text-muted-foreground">{incomeDeltaLabel}</p></CardContent></Card>
        <Card className={`border-l-4 ${hasOverBudget ? 'border-l-red-500' : hasWarningBudget ? 'border-l-yellow-500' : 'border-l-red-400'}`}><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Расходы за {periodLabel}</p><p className="text-2xl font-bold text-red-600">{formatMajor(currentExpense)}</p><p className="text-xs text-muted-foreground">{expenseDeltaLabel}</p>
          {(hasOverBudget || hasWarningBudget) && <p className={`text-xs ${hasOverBudget ? 'text-red-600' : 'text-yellow-600'}`}>{hasOverBudget ? <><AlertTriangle className="h-3 w-3 inline mr-1" />Перерасход</> : <><AlertCircle className="h-3 w-3 inline mr-1" />Близко к лимиту</>}</p>}
        </CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Чистый поток за {periodLabel}</p><p className="text-2xl font-bold">{formatMajor(currentNet)}</p><p className="text-xs text-muted-foreground">{netDeltaLabel}</p></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Динамика доходов и расходов</CardTitle><p className="text-sm text-muted-foreground">Последние 12 месяцев</p></CardHeader><CardContent><MonthlyTrendChart labels={monthlyTrend.labels} income={monthlyTrend.income} expense={monthlyTrend.expense} currency={currency} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Структура расходов</CardTitle><p className="text-sm text-muted-foreground">Период: {periodLabel}</p></CardHeader><CardContent>
          {hasBreakdown ? <ExpenseBreakdownDonut labels={expenseBreakdown.labels} values={expenseBreakdown.values} currency={currency} /> : <p className="text-center text-muted-foreground py-8">Нет данных о расходах</p>}
        </CardContent></Card>
      </div>

      {hasBreakdown && <Card><CardHeader><CardTitle>Топ категорий расходов — {periodLabel}</CardTitle></CardHeader><CardContent className="space-y-2">
        {expenseBreakdown.labels.map((label, index) => {
          const valueMajor = expenseBreakdown.values[index];
          const pct = breakdownTotal > 0 ? (valueMajor / breakdownTotal) * 100 : 0;
          const budgetStatus = budgetStatusByCategory.get(label);
          return (
            <div key={label} className={`flex items-center justify-between p-3 rounded-lg ${budgetStatus === 'over' ? 'bg-red-50' : budgetStatus === 'warning' ? 'bg-yellow-50' : 'bg-muted/30'}`}>
              <div><p className="font-medium">{label}</p><p className="text-xs text-muted-foreground">{pct.toFixed(1)}% от расходов</p></div>
              <div className="text-right"><p className="font-bold">{formatMajor(valueMajor)}</p>
                {budgetStatus && <Badge variant={budgetStatus === 'over' ? 'destructive' : 'secondary'}>{budgetStatus === 'over' ? 'перерасход' : 'близко к лимиту'}</Badge>}
              </div>
            </div>
          );
        })}
      </CardContent></Card>}

      {productBreakdown.labels.length > 0 && <Card><CardHeader><CardTitle>Топ товаров — {periodLabel}</CardTitle><p className="text-sm text-muted-foreground">Наиболее часто покупаемые товары</p></CardHeader><CardContent>
        <ProductBreakdownTable labels={productBreakdown.labels} values={productBreakdown.values} quantities={productBreakdown.quantities} units={productBreakdown.units} currency={currency} />
      </CardContent></Card>}
    </div>
  );
}
