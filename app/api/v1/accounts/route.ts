import { NextResponse } from "next/server";
import { withApiAuth } from "@/lib/api/middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/accounts - Получить список счетов
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

      const includeBalance = searchParams.get("include_balance") === "true";
      const type = searchParams.get("type"); // cash, bank, card, etc.

      let query = supabase
        .from("accounts")
        .select("id, name, type, currency, initial_balance, is_active, created_at")
        .eq("user_id", apiKey.user_id)
        .order("created_at", { ascending: false });

      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch accounts", details: error.message },
          { status: 500 }
        );
      }

      // Если нужен баланс, добавляем расчёт
      if (includeBalance && data) {
        const accountsWithBalance = await Promise.all(
          data.map(async (account) => {
            const { data: transactions } = await supabase
              .from("transactions")
              .select("amount, direction")
              .eq("account_id", account.id);

            const balance = transactions?.reduce((sum, txn) => {
              const amount = Number(txn.amount) || 0;
              return sum + (txn.direction === "income" ? amount : -amount);
            }, Number(account.initial_balance) || 0) || 0;

            return { ...account, current_balance: balance };
          })
        );
        return NextResponse.json({ data: accountsWithBalance });
      }

      return NextResponse.json({ data });
    },
    { requiredScope: "read" }
  );
}

/**
 * POST /api/v1/accounts - Создать счёт
 */
export async function POST(request: Request) {
  return withApiAuth(
    request,
    async (apiKey, req) => {
      const body = await req.json();
      const { name, type, currency = "RUB", initial_balance = 0 } = body;

      if (!name || !type) {
        return NextResponse.json(
          { error: "Missing required fields: name, type" },
          { status: 400 }
        );
      }

      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data, error } = await supabase
        .from("accounts")
        .insert({
          user_id: apiKey.user_id,
          name,
          type,
          currency,
          initial_balance,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to create account", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data }, { status: 201 });
    },
    { requiredScope: "write" }
  );
}
