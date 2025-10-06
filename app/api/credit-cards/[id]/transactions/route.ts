import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const supabase = await createRouteClient();
  const { id } = await context.params;

  try {
    // Проверяем аутентификацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем транзакции по этой карте
    // Включаем обычные транзакции (где account_id = id)
    // И переводы (где карта участвует как источник или назначение)
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select(
        `
        id,
        direction,
        amount,
        currency,
        occurred_at,
        note,
        counterparty,
        account_id,
        transfer_from_account_id,
        transfer_to_account_id,
        categories(name)
      `
      )
      .eq("user_id", user.id)
      .or(`account_id.eq.${id},transfer_from_account_id.eq.${id},transfer_to_account_id.eq.${id}`)
      .order("occurred_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch transactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    // Получаем уникальные account_id для переводов
    const accountIds = new Set<string>();
    transactions.forEach((txn) => {
      if (txn.transfer_from_account_id) accountIds.add(txn.transfer_from_account_id);
      if (txn.transfer_to_account_id) accountIds.add(txn.transfer_to_account_id);
    });

    // Загружаем названия счетов
    const accountNames = new Map<string, string>();
    if (accountIds.size > 0) {
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, name")
        .in("id", Array.from(accountIds));
      
      accounts?.forEach((acc) => {
        accountNames.set(acc.id, acc.name);
      });
    }

    // Форматируем данные
    const formattedTransactions = transactions.map((txn) => ({
      id: txn.id,
      direction: txn.direction,
      amount: txn.amount,
      currency: txn.currency,
      occurred_at: txn.occurred_at,
      note: txn.note,
      counterparty: txn.counterparty,
      category_name: (txn.categories as { name?: string } | null)?.name || null,
      transfer_from_account_id: txn.transfer_from_account_id,
      transfer_to_account_id: txn.transfer_to_account_id,
      transfer_from_account_name: txn.transfer_from_account_id
        ? accountNames.get(txn.transfer_from_account_id) || null
        : null,
      transfer_to_account_name: txn.transfer_to_account_id
        ? accountNames.get(txn.transfer_to_account_id) || null
        : null,
    }));

    return NextResponse.json({ transactions: formattedTransactions });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
