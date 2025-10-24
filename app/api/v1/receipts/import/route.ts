import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/receipts/import - Импорт чека из Telegram ФНС бота
 * 
 * Body:
 * {
 *   shop_name: string,
 *   date: string (ISO),
 *   total_amount: number (в копейках),
 *   items: Array<{ name: string, price: number, category: string }>,
 *   main_category: string,
 *   raw_text: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRSCClient();

    // Проверка авторизации
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Парсим тело запроса
    const body = await request.json();
    const { shop_name, date, total_amount, items, main_category, raw_text } = body;

    // Валидация
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items are required" },
        { status: 400 }
      );
    }

    if (!total_amount || total_amount <= 0) {
      return NextResponse.json(
        { error: "Total amount must be positive" },
        { status: 400 }
      );
    }

    // Получаем категории пользователя
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, type")
      .eq("user_id", user.id)
      .eq("type", "expense");

    // Создаём маппинг название → ID
    const userCategoryMap: Record<string, string> = {};
    categories?.forEach((cat: { id: string; name: string; type: string }) => {
      userCategoryMap[cat.name] = cat.id;
    });

    // Получаем счёт по умолчанию
    const { data: defaultAccount } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .single();

    if (!defaultAccount) {
      return NextResponse.json(
        { error: "No default account found" },
        { status: 400 }
      );
    }

    // Создаём транзакции для каждого товара
    const createdTransactions = [];

    for (const item of items) {
      // Ищем категорию
      let categoryId = userCategoryMap[item.category];
      
      // Если не нашли точное совпадение, ищем "Прочее"
      if (!categoryId) {
        categoryId = userCategoryMap["Прочее"] || categories?.[0]?.id;
      }

      // Создаём транзакцию
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          amount: Math.round(item.price * 100), // Конвертируем в копейки
          direction: "expense",
          account_id: defaultAccount.id,
          category_id: categoryId,
          occurred_at: date || new Date().toISOString(),
          note: `${shop_name ? shop_name + ": " : ""}${item.name}`,
          tags: ["auto-import", "fns-receipt"],
        })
        .select()
        .single();

      if (!txError && transaction) {
        createdTransactions.push({
          id: transaction.id,
          name: item.name,
          amount: item.price,
          category: item.category,
        });
      }
    }

    // Сохраняем сам чек для истории (опционально)
    await supabase.from("receipts").insert({
      user_id: user.id,
      shop_name,
      date: date || new Date().toISOString(),
      total_amount,
      items_count: items.length,
      main_category,
      raw_text,
      processed: true,
    });

    return NextResponse.json(
      {
        success: true,
        transactions_created: createdTransactions.length,
        transactions: createdTransactions,
        total_amount: total_amount / 100, // Возвращаем в рублях
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Receipt import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
