import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productName = searchParams.get("name");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (!productName) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    const supabase = await createRouteClient();

    let from: Date;
    let to: Date;

    if (fromParam && toParam) {
      from = new Date(fromParam);
      to = new Date(toParam);
      to.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
    }

    // Загружаем только расходные транзакции за период
    const { data: transactions } = await supabase
      .from("transactions")
      .select("id, occurred_at, note")
      .eq("direction", "expense")
      .gte("occurred_at", from.toISOString())
      .lte("occurred_at", to.toISOString());

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ transactions: [] });
    }

    const transactionIds = transactions.map((t) => t.id);
    const transactionMap = new Map(
      transactions.map((t) => [t.id, { date: t.occurred_at, note: t.note }])
    );

    // Загружаем позиции с указанным товаром
    type ItemRow = {
      id: string;
      transaction_id: string;
      quantity: number;
      unit: string;
      total_amount: number;
    };

    const { data: itemsData } = await supabase
      .from("transaction_items")
      .select("id, transaction_id, quantity, unit, total_amount")
      .in("transaction_id", transactionIds)
      .eq("name", productName);

    if (!itemsData || itemsData.length === 0) {
      return NextResponse.json({ transactions: [] });
    }

    const result = (itemsData as ItemRow[]).map((item) => {
      const txn = transactionMap.get(item.transaction_id);
      return {
        id: item.id,
        date: txn?.date || "",
        amount: item.total_amount / 100,
        quantity: item.quantity,
        unit: item.unit,
        note: txn?.note || undefined,
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ transactions: result });
  } catch (error) {
    console.error("Failed to load product transactions:", error);
    return NextResponse.json(
      { error: "Failed to load product transactions" },
      { status: 500 }
    );
  }
}
