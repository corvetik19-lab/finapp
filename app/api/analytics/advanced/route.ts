import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PeriodComparison {
  current: {
    income: number;
    expense: number;
    balance: number;
    transactionCount: number;
  };
  previous: {
    income: number;
    expense: number;
    balance: number;
    transactionCount: number;
  };
  changes: {
    income: number; // %
    expense: number; // %
    balance: number; // %
    transactionCount: number; // %
  };
}

interface TopTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  direction: "income" | "expense" | "transfer";
}

interface CategoryAverage {
  category: string;
  category_id: string;
  averageAmount: number;
  transactionCount: number;
  totalAmount: number;
}

interface MonthlyTrend {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  balance: number;
}

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
    const period = searchParams.get("period") || "month"; // month, quarter, year
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0];

    // Calculate date ranges
    const end = new Date(endDate);
    let currentStart = new Date(end);
    let previousStart = new Date(end);
    let previousEnd = new Date(end);

    switch (period) {
      case "month":
        currentStart.setMonth(currentStart.getMonth() - 1);
        previousStart.setMonth(previousStart.getMonth() - 2);
        previousEnd.setMonth(previousEnd.getMonth() - 1);
        break;
      case "quarter":
        currentStart.setMonth(currentStart.getMonth() - 3);
        previousStart.setMonth(previousStart.getMonth() - 6);
        previousEnd.setMonth(previousEnd.getMonth() - 3);
        break;
      case "year":
        currentStart.setFullYear(currentStart.getFullYear() - 1);
        previousStart.setFullYear(previousStart.getFullYear() - 2);
        previousEnd.setFullYear(previousEnd.getFullYear() - 1);
        break;
    }

    const currentStartStr = currentStart.toISOString().split("T")[0];
    const currentEndStr = end.toISOString().split("T")[0];
    const previousStartStr = previousStart.toISOString().split("T")[0];
    const previousEndStr = previousEnd.toISOString().split("T")[0];

    // 1. Period Comparison
    const [currentData, previousData] = await Promise.all([
      supabase
        .from("transactions")
        .select("direction, amount")
        .eq("user_id", user.id)
        .gte("date", currentStartStr)
        .lte("date", currentEndStr),
      supabase
        .from("transactions")
        .select("direction, amount")
        .eq("user_id", user.id)
        .gte("date", previousStartStr)
        .lte("date", previousEndStr),
    ]);

    const calculatePeriodStats = (data: any[]) => {
      const income = data
        .filter((t) => t.direction === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = data
        .filter((t) => t.direction === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        income,
        expense,
        balance: income - expense,
        transactionCount: data.length,
      };
    };

    const current = calculatePeriodStats(currentData.data || []);
    const previous = calculatePeriodStats(previousData.data || []);

    const comparison: PeriodComparison = {
      current,
      previous,
      changes: {
        income: previous.income > 0 ? ((current.income - previous.income) / previous.income) * 100 : 0,
        expense: previous.expense > 0 ? ((current.expense - previous.expense) / previous.expense) * 100 : 0,
        balance: previous.balance !== 0 ? ((current.balance - previous.balance) / Math.abs(previous.balance)) * 100 : 0,
        transactionCount: previous.transactionCount > 0 ? ((current.transactionCount - previous.transactionCount) / previous.transactionCount) * 100 : 0,
      },
    };

    // 2. Top 5 Transactions
    const { data: topTransactions } = await supabase
      .from("transactions")
      .select(`
        id,
        date,
        amount,
        description,
        direction,
        categories!inner(name)
      `)
      .eq("user_id", user.id)
      .gte("date", currentStartStr)
      .lte("date", currentEndStr)
      .order("amount", { ascending: false })
      .limit(5);

    const top5: TopTransaction[] = (topTransactions || []).map((t: any) => ({
      id: t.id,
      date: t.date,
      amount: t.amount,
      description: t.description || "",
      category: t.categories?.[0]?.name || "Без категории",
      direction: t.direction,
    }));

    // 3. Category Averages
    const { data: categoryData } = await supabase
      .from("transactions")
      .select(`
        amount,
        category_id,
        categories!inner(name)
      `)
      .eq("user_id", user.id)
      .eq("direction", "expense")
      .gte("date", currentStartStr)
      .lte("date", currentEndStr);

    const categoryMap = new Map<string, { count: number; total: number; name: string }>();

    (categoryData || []).forEach((t: any) => {
      const catId = t.category_id;
      const catName = t.categories?.[0]?.name || "Без категории";
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, { count: 0, total: 0, name: catName });
      }
      const cat = categoryMap.get(catId)!;
      cat.count++;
      cat.total += t.amount;
    });

    const categoryAverages: CategoryAverage[] = Array.from(categoryMap.entries())
      .map(([id, data]) => ({
        category_id: id,
        category: data.name,
        averageAmount: data.total / data.count,
        transactionCount: data.count,
        totalAmount: data.total,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    // 4. Monthly Trends (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: trendData } = await supabase
      .from("transactions")
      .select("date, direction, amount")
      .eq("user_id", user.id)
      .gte("date", twelveMonthsAgo.toISOString().split("T")[0]);

    const monthlyMap = new Map<string, { income: number; expense: number }>();

    (trendData || []).forEach((t: any) => {
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

    const trends: MonthlyTrend[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      comparison,
      top5,
      categoryAverages,
      trends,
    });
  } catch (error) {
    console.error("Advanced analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
