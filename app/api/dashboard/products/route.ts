import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const supabase = await createRouteClient();

    // Определяем диапазон дат
    let from: Date;
    let to: Date;

    if (fromParam && toParam) {
      // Произвольный период
      from = new Date(fromParam);
      to = new Date(toParam);
      to.setHours(23, 59, 59, 999);
    } else {
      // Предустановленный период
      const now = new Date();
      to = new Date(now);
      to.setHours(23, 59, 59, 999);

      switch (period) {
        case "week":
          from = new Date(now);
          from.setDate(now.getDate() - 7);
          break;
        case "year":
          from = new Date(now);
          from.setFullYear(now.getFullYear() - 1);
          break;
        case "month":
        default:
          from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
          break;
      }
      from.setHours(0, 0, 0, 0);
    }

    // Загружаем только расходные транзакции за период
    const { data: transactions } = await supabase
      .from("transactions")
      .select("id")
      .eq("direction", "expense")
      .gte("occurred_at", from.toISOString())
      .lte("occurred_at", to.toISOString());

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        products: [],
        from: from.toISOString(),
        to: to.toISOString(),
      });
    }

    const transactionIds = transactions.map((t) => t.id);

    // Загружаем позиции товаров
    type ProductItemRow = {
      name: string;
      quantity: number;
      unit: string;
      total_amount: number;
      transaction_id: string;
    };

    const { data: itemsData } = await supabase
      .from("transaction_items")
      .select("name, quantity, unit, total_amount, transaction_id")
      .in("transaction_id", transactionIds);

    if (!itemsData || itemsData.length === 0) {
      return NextResponse.json({
        products: [],
        from: from.toISOString(),
        to: to.toISOString(),
      });
    }

    // Исключаем нетоварные позиции (категории, услуги, кредиты)
    const EXCLUDED_ITEMS = [
      "прочее", "такси", "зарядка", "кредит", "займ", "ипотека",
      "платёж по кредиту", "платеж по кредиту", "погашение кредита",
      "проценты по кредиту", "комиссия", "штраф", "пеня",
    ];

    const isExcluded = (name: string) => {
      const lower = name.toLowerCase().trim();
      return EXCLUDED_ITEMS.some((ex) => lower === ex || lower.includes(ex));
    };

    // Агрегируем данные по товарам
    const productMap = new Map<
      string,
      {
        totalQuantity: number;
        unit: string;
        totalAmount: number;
        transactionIds: Set<string>;
      }
    >();

    (itemsData as ProductItemRow[]).forEach((item) => {
      // Пропускаем исключённые позиции
      if (isExcluded(item.name)) return;

      if (!productMap.has(item.name)) {
        productMap.set(item.name, {
          totalQuantity: 0,
          unit: item.unit,
          totalAmount: 0,
          transactionIds: new Set(),
        });
      }
      const productData = productMap.get(item.name)!;
      productData.totalQuantity += item.quantity;
      productData.totalAmount += item.total_amount / 100;
      productData.transactionIds.add(item.transaction_id);
    });

    const products = Array.from(productMap.entries())
      .map(([name, data]) => ({
        name,
        quantity: data.totalQuantity,
        unit: data.unit,
        totalAmount: data.totalAmount,
        transactionCount: data.transactionIds.size,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return NextResponse.json({
      products,
      from: from.toISOString(),
      to: to.toISOString(),
    });
  } catch (error) {
    console.error("Failed to load products:", error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}
