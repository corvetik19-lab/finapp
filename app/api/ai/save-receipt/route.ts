import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    
    // Проверка авторизации
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Не авторизован" },
        { status: 401 }
      );
    }

    const { storeName, date, itemsByCategory, totalAmount } = await request.json();

    // Находим счёт пользователя
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, name")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .limit(1);

    const account = accounts?.[0];
    if (!account) {
      return NextResponse.json(
        { success: false, message: "Счёт не найден. Создайте счёт сначала." },
        { status: 400 }
      );
    }

    const createdTransactions = [];
    let totalCreated = 0;

    // Создаём транзакцию для каждой категории
    for (const categoryGroup of itemsByCategory) {
      const { categoryId, categoryName, items, totalAmount: categoryTotal } = categoryGroup;

      // Создаём транзакцию
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          account_id: account.id,
          direction: "expense",
          amount: -Math.round(categoryTotal * 100), // в копейках, отрицательная
          currency: "RUB",
          occurred_at: date || new Date().toISOString(),
          note: `Покупка в ${storeName}`,
          counterparty: storeName,
          category_id: categoryId
        })
        .select()
        .single();

      if (txError || !transaction) {
        console.error("Transaction error:", txError);
        continue;
      }

      // Добавляем позиции товаров
      for (const item of items) {
        await supabase
          .from("transaction_items")
          .insert({
            user_id: user.id,
            transaction_id: transaction.id,
            name: item.productName,
            quantity: item.quantity,
            unit: 'шт',
            price_per_unit: Math.round(item.pricePerUnit * 100),
            total_amount: Math.round(item.total * 100),
            category_id: categoryId
          });
      }

      // Обновляем баланс счёта
      const { data: accountData } = await supabase
        .from("accounts")
        .select("balance")
        .eq("id", account.id)
        .single();
      
      if (accountData) {
        const newBalance = accountData.balance + transaction.amount;
        await supabase
          .from("accounts")
          .update({ balance: newBalance })
          .eq("id", account.id);
      }

      createdTransactions.push({
        categoryName: categoryName || "Без категории",
        itemsCount: items.length,
        total: categoryTotal
      });
      totalCreated++;
    }

    const summary = `✅ Чек обработан!\n\n` +
      `🏪 Магазин: ${storeName}\n` +
      `📅 Дата: ${date}\n` +
      `💰 Общая сумма: ${totalAmount.toFixed(2)} ₽\n` +
      `📊 Создано транзакций: ${totalCreated}\n\n` +
      createdTransactions.map(t => 
        `• ${t.categoryName}: ${t.itemsCount} товар(ов) на ${t.total.toFixed(2)} ₽`
      ).join('\n');

    return NextResponse.json({
      success: true,
      message: summary,
      data: {
        transactionsCreated: totalCreated,
        transactions: createdTransactions
      }
    });

  } catch (error) {
    console.error("Save receipt error:", error);
    return NextResponse.json(
      { success: false, message: "Ошибка сохранения чека: " + (error as Error).message },
      { status: 500 }
    );
  }
}
