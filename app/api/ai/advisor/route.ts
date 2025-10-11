import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import {
  calculateFinancialHealth,
  detectMoneyLeaks,
  compareWithIdealBudget,
  generatePersonalizedAdvice,
  generateActionPlan,
} from "@/lib/ai/advisor";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем данные за последние 3 месяца
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [transactionsRes, accountsRes, budgetsRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("date, direction, amount, category_id, categories!inner(name, type)")
        .eq("user_id", user.id)
        .gte("date", threeMonthsAgo.toISOString().split("T")[0]),
      supabase.from("accounts").select("balance").eq("user_id", user.id),
      supabase.from("budgets").select("amount, spent").eq("user_id", user.id),
    ]);

    const transactions = transactionsRes.data || [];
    const accounts = accountsRes.data || [];

    // Рассчитываем показатели
    const totalIncome = transactions
      .filter((t: { direction: string }) => t.direction === "income")
      .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0) / 3; // среднее за месяц

    const totalExpense = transactions
      .filter((t: { direction: string }) => t.direction === "expense")
      .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0) / 3;

    const monthlySavings = totalIncome - totalExpense;
    const emergencyFund = accounts.reduce((sum: number, acc: { balance: number }) => sum + acc.balance, 0);

    // Расходы по категориям
    const categoryMap = new Map<string, number>();
    transactions
      .filter((t: { direction: string }) => t.direction === "expense")
      .forEach((t: { amount: number; categories?: Array<{ name: string }> }) => {
        const name = t.categories?.[0]?.name || "Без категории";
        categoryMap.set(name, (categoryMap.get(name) || 0) + t.amount / 3);
      });

    const categoryExpenses = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));

    // Вариация расходов
    const monthlyExpenses: number[] = [];
    const monthMap = new Map<string, number>();
    transactions
      .filter((t: { direction: string }) => t.direction === "expense")
      .forEach((t: { date: string; amount: number }) => {
        const month = t.date.substring(0, 7);
        monthMap.set(month, (monthMap.get(month) || 0) + t.amount);
      });
    monthMap.forEach((val) => monthlyExpenses.push(val));

    const avgExpense = monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length;
    const variance =
      monthlyExpenses.reduce((sum, val) => sum + Math.pow(val - avgExpense, 2), 0) /
      monthlyExpenses.length;
    const stdDev = Math.sqrt(variance);
    const expenseVariance = avgExpense > 0 ? stdDev / avgExpense : 0;

    // Соблюдение бюджета
    const budgets = budgetsRes.data || [];
    const budgetUtilization = budgets.length > 0
      ? budgets.reduce((sum: number, b: { spent: number; amount: number }) => {
          return sum + (b.spent <= b.amount ? 100 : 0);
        }, 0) / budgets.length
      : 80; // default

    // Финансовое здоровье
    const healthScore = calculateFinancialHealth({
      monthly_income: totalIncome,
      monthly_expense: totalExpense,
      monthly_savings: monthlySavings,
      emergency_fund: emergencyFund,
      total_debt: 0, // TODO: можно добавить
      budget_compliance_rate: budgetUtilization,
      expense_variance: expenseVariance,
    });

    // Денежные утечки
    const benchmarks = {
      "жилье": 30,
      "продукты": 15,
      "транспорт": 10,
      "кафе": 5,
      "развлечения": 5,
    };
    const moneyLeaks = detectMoneyLeaks(categoryExpenses, totalIncome, benchmarks);

    // Идеальный бюджет (упрощённо)
    const needsCategories = ["жилье", "продукты", "транспорт", "коммунальные"];
    const wantsCategories = ["кафе", "развлечения", "одежда", "подарки"];

    const needsAmount = categoryExpenses
      .filter((c) => needsCategories.some((n) => c.category.toLowerCase().includes(n)))
      .reduce((sum, c) => sum + c.amount, 0);

    const wantsAmount = categoryExpenses
      .filter((c) => wantsCategories.some((n) => c.category.toLowerCase().includes(n)))
      .reduce((sum, c) => sum + c.amount, 0);

    const needsPct = totalIncome > 0 ? (needsAmount / totalIncome) * 100 : 0;
    const wantsPct = totalIncome > 0 ? (wantsAmount / totalIncome) * 100 : 0;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    const idealBudget = compareWithIdealBudget(needsPct, wantsPct, savingsRate);

    // AI советы
    const advice = await generatePersonalizedAdvice({
      health_score: healthScore,
      money_leaks: moneyLeaks,
      monthly_income: totalIncome,
      monthly_expense: totalExpense,
    });

    // План действий
    const actionPlan = generateActionPlan(
      {
        monthly_savings: monthlySavings,
        debt: 0,
        emergency_fund: emergencyFund,
      },
      {
        build_emergency_fund: 3,
      },
      totalIncome,
      totalExpense
    );

    return NextResponse.json({
      health_score: healthScore,
      money_leaks: moneyLeaks,
      ideal_budget: idealBudget,
      advice,
      action_plan: actionPlan,
      stats: {
        monthly_income: totalIncome,
        monthly_expense: totalExpense,
        monthly_savings: monthlySavings,
        emergency_fund: emergencyFund,
      },
    });
  } catch (error) {
    console.error("AI advisor error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
