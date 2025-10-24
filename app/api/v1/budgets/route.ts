import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/budgets - Получить бюджеты
 */
export async function GET(request: Request) {
  return withApiAuth(
    request,
    async (apiKey, req) => {
      const { searchParams } = new URL(req.url);
      const { createClient } = await import("@supabase/supabase-js");
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const includeSpent = searchParams.get("include_spent") === "true";
      const active = searchParams.get("active"); // true/false

      let query = supabase
        .from("budgets")
        .select(`
          id, 
          category_id, 
          limit_amount, 
          period_start, 
          period_end, 
          currency,
          created_at,
          categories(id, name, icon)
        `)
        .eq("user_id", apiKey.user_id)
        .order("period_start", { ascending: false });

      // Фильтр по активным бюджетам
      if (active === "true") {
        const now = new Date().toISOString().split("T")[0];
        query = query.lte("period_start", now).gte("period_end", now);
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch budgets", details: error.message },
          { status: 500 }
        );
      }

      // Если нужно посчитать потраченное
      if (includeSpent && data) {
        const budgetsWithSpent = await Promise.all(
          data.map(async (budget) => {
            const { data: transactions } = await supabase
              .from("transactions")
              .select("amount")
              .eq("user_id", apiKey.user_id)
              .eq("category_id", budget.category_id)
              .eq("direction", "expense")
              .gte("occurred_at", budget.period_start)
              .lte("occurred_at", budget.period_end);

            const spent = transactions?.reduce(
              (sum, txn) => sum + (Number(txn.amount) || 0),
              0
            ) || 0;

            const remaining = Number(budget.limit_amount) - spent;
            const percentage = (spent / Number(budget.limit_amount)) * 100;

            return {
              ...budget,
              spent,
              remaining,
              percentage: Math.min(100, percentage),
              status:
                percentage >= 100
                  ? "exceeded"
                  : percentage >= 80
                  ? "warning"
                  : "ok",
            };
          })
        );
        return NextResponse.json({ data: budgetsWithSpent });
      }

      return NextResponse.json({ data });
    },
    { requiredScope: "read" }
  );
}

/**
 * POST /api/v1/budgets - Создать бюджет
 */
export async function POST(request: Request) {
  return withApiAuth(
    request,
    async (apiKey, req) => {
      const body = await req.json();
      const {
        category_id,
        limit_amount,
        period_start,
        period_end,
        currency = "RUB",
      } = body;

      if (!category_id || !limit_amount || !period_start || !period_end) {
        return NextResponse.json(
          {
            error:
              "Missing required fields: category_id, limit_amount, period_start, period_end",
          },
          { status: 400 }
        );
      }

      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data, error } = await supabase
        .from("budgets")
        .insert({
          user_id: apiKey.user_id,
          category_id,
          limit_amount,
          period_start,
          period_end,
          currency,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to create budget", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data }, { status: 201 });
    },
    { requiredScope: "write" }
  );
}
