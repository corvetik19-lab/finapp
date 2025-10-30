import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Получаем информацию о кредите
    const { data: loan } = await supabase
      .from("loans")
      .select("name, bank")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    // Формируем counterparty для поиска
    const counterparty = `${loan.name} (${loan.bank})`;

    // Получаем транзакции по кредиту (ищем по counterparty)
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select(`
        id,
        direction,
        amount,
        currency,
        occurred_at,
        note,
        counterparty,
        category:categories(name)
      `)
      .eq("counterparty", counterparty)
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to load transactions:", error);
      return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
    }

    // Форматируем данные
    const formattedTransactions = (transactions || []).map((txn: any) => ({
      id: txn.id,
      direction: txn.direction,
      amount: txn.amount,
      currency: txn.currency,
      occurred_at: txn.occurred_at,
      note: txn.note,
      counterparty: txn.counterparty,
      category_name: Array.isArray(txn.category) ? null : txn.category?.name || null,
    }));

    return NextResponse.json({ transactions: formattedTransactions });
  } catch (error) {
    console.error("GET /api/loans/[id]/transactions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
