import { createRSCClient } from "@/lib/supabase/helpers";
import { listBudgetsWithUsage } from "@/lib/budgets/service";
import { formatMoney } from "@/lib/utils/format";
import { createBudget } from "./actions";
import BudgetsList from "@/components/budgets/BudgetsList";
import BudgetForm from "@/components/budgets/BudgetForm";
import SavingsDistribution from "@/components/budgets/SavingsDistribution";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, PieChart, ListChecks, Clock } from "lucide-react";

// Делаем страницу динамической
export const dynamic = 'force-dynamic';

export default async function BudgetsPage() {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  // Загружаем категории доходов, расходов и "both" (доход+расход)
  let categoriesQuery = supabase
    .from("categories")
    .select("id,name,kind")
    .in("kind", ["income", "expense", "both"])
    .order("kind", { ascending: false })
    .order("name", { ascending: true });

  if (companyId) {
    categoriesQuery = categoriesQuery.eq("company_id", companyId);
  }

  const { data: categoriesRaw } = await categoriesQuery;

  const categories = (categoriesRaw ?? []) as { id: string; name: string; kind: "income" | "expense" | "transfer" | "both" }[];

  // Загружаем кредитные карты (карты с лимитом)
  let accountsQuery = supabase
    .from("accounts")
    .select("id,name,type")
    .eq("type", "card")
    .not("credit_limit", "is", null)
    .eq("archived", false)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (companyId) {
    accountsQuery = accountsQuery.eq("company_id", companyId);
  }

  const { data: accountsRaw } = await accountsQuery;

  const creditCards = (accountsRaw ?? []) as { id: string; name: string; type: string }[];

  // Загружаем дебетовые карты для распределения экономии с балансами
  let debitAccountsQuery = supabase
    .from("accounts")
    .select("id,name,type,credit_limit,balance")
    .eq("type", "card")
    .eq("archived", false)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (companyId) {
    debitAccountsQuery = debitAccountsQuery.eq("company_id", companyId);
  }

  const { data: debitAccountsRaw, error: debitError } = await debitAccountsQuery;

  if (debitError) {
    console.error("Error loading debit cards:", debitError);
  }

  // Фильтруем только дебетовые карты (без кредитного лимита)
  const debitCards = (debitAccountsRaw ?? [])
    .filter((card: { id: string; name: string; type: string; credit_limit: number | null; balance: number }) => card.credit_limit === null)
    .map((card: { id: string; name: string; type: string; balance: number }) => ({
      id: card.id,
      name: card.name,
      type: card.type,
      balance: card.balance || 0
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Бюджеты</h1>
          <p className="text-sm text-muted-foreground">Планирование доходов и расходов</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Плановые доходы</p>
                <p className="text-lg font-bold">{formatMoney(totalIncomeLimitMinor, "RUB")}</p>
                <p className="text-xs text-muted-foreground">Получено: {formatMoney(totalIncomeActualMinor, "RUB")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Плановые расходы</p>
                <p className="text-lg font-bold">{formatMoney(totalExpenseLimitMinor, "RUB")}</p>
                <p className="text-xs text-muted-foreground">Потрачено: {formatMoney(totalExpenseSpentMinor, "RUB")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Планируемая экономия</p>
                <p className={`text-lg font-bold ${budgetBalanceMinor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatMoney(budgetBalanceMinor, "RUB")}
                </p>
                <p className="text-xs text-muted-foreground">Фактическая: {formatMoney(actualBalanceMinor, "RUB")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <PieChart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Покрытие расходов</p>
                <p className={`text-lg font-bold ${coveragePercent <= 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {coveragePercent}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {coveragePercent <= 100 ? `✓ Доходы покрывают` : `⚠️ Превышение ${coveragePercent - 100}%`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <ListChecks className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Всего бюджетов</p>
                <p className="text-lg font-bold">{budgets.length}</p>
                <p className="text-xs text-muted-foreground">Доходы: {incomeBudgets.length} | Расходы: {expenseBudgets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Остаток бюджета</p>
                <p className="text-lg font-bold">{formatMoney(actualBalanceMinor, "RUB")}</p>
                <p className="text-xs text-muted-foreground">Фактический остаток</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      <BudgetsList budgets={budgets} categories={categories} />
    </div>
  );
}
