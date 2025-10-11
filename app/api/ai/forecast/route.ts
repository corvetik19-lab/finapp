import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import {
  forecastNextMonth,
  forecastGoalAchievement,
  simulateScenario,
  generateForecastInsights,
  type WhatIfScenario,
  type MonthlyData,
} from "@/lib/ai/forecasting";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "expense"; // expense, goal, scenario

    // Получаем исторические данные (последние 12 месяцев)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("date, direction, amount")
      .eq("user_id", user.id)
      .gte("date", twelveMonthsAgo.toISOString().split("T")[0]);

    // Группируем по месяцам
    const monthlyMap = new Map<string, { income: number; expense: number }>();

    (transactions || []).forEach((t: { date: string; amount: number; direction: string }) => {
      const month = t.date.substring(0, 7); // YYYY-MM
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { income: 0, expense: 0 });
      }
      const data = monthlyMap.get(month)!;
      if (t.direction === "income") {
        data.income += t.amount;
      } else if (t.direction === "expense") {
        data.expense += t.amount;
      }
    });

    const monthlyData: MonthlyData[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    if (type === "expense") {
      // Прогноз расходов
      if (monthlyData.length < 2) {
        return NextResponse.json({
          error: "Недостаточно данных для прогноза",
          message: "Необходимо минимум 2 месяца транзакций",
        }, { status: 400 });
      }

      const forecast = forecastNextMonth(monthlyData);

      // Получаем средний месячный доход
      const avgIncome = monthlyData.reduce((sum, d) => sum + d.income, 0) / monthlyData.length;

      // Генерируем AI инсайты
      const insights = await generateForecastInsights(forecast, avgIncome);

      return NextResponse.json({
        forecast,
        insights,
        historical: monthlyData,
      });
    }

    if (type === "goal") {
      // Прогноз достижения цели
      const goalAmount = parseInt(searchParams.get("goal_amount") || "0");
      const currentSavings = parseInt(searchParams.get("current_savings") || "0");

      if (!goalAmount) {
        return NextResponse.json({ error: "Missing goal_amount" }, { status: 400 });
      }

      // Средние показатели за последние 3 месяца
      const recentMonths = monthlyData.slice(-3);
      const avgIncome = recentMonths.reduce((sum, d) => sum + d.income, 0) / recentMonths.length;
      const avgExpense = recentMonths.reduce((sum, d) => sum + d.expense, 0) / recentMonths.length;
      const avgSavingsRate = avgIncome > 0 ? ((avgIncome - avgExpense) / avgIncome) * 100 : 0;

      const goalForecast = forecastGoalAchievement(
        currentSavings,
        goalAmount,
        avgIncome,
        avgExpense
      );

      return NextResponse.json({
        goal_forecast: goalForecast,
        current_stats: {
          monthly_income: avgIncome,
          monthly_expense: avgExpense,
          monthly_balance: avgIncome - avgExpense,
          savings_rate: avgSavingsRate,
        },
      });
    }

    if (type === "scenario") {
      // "Что если?" сценарий
      const scenarioData = searchParams.get("scenario");
      if (!scenarioData) {
        return NextResponse.json({ error: "Missing scenario" }, { status: 400 });
      }

      const scenario: WhatIfScenario = JSON.parse(scenarioData);

      // Средние показатели за последние 3 месяца
      const recentMonths = monthlyData.slice(-3);
      const avgIncome = recentMonths.reduce((sum, d) => sum + d.income, 0) / recentMonths.length;
      const avgExpense = recentMonths.reduce((sum, d) => sum + d.expense, 0) / recentMonths.length;

      const months = parseInt(searchParams.get("months") || "12");
      const result = simulateScenario(scenario, avgIncome, avgExpense, months);

      return NextResponse.json({
        scenario_result: result,
        current_stats: {
          monthly_income: avgIncome,
          monthly_expense: avgExpense,
          monthly_balance: avgIncome - avgExpense,
        },
      });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error) {
    console.error("Forecast API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
