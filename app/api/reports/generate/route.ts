import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";
import { reportGenerateSchema } from "@/lib/reports/schema";
import { getPeriodDates } from "@/lib/reports/utils";
import type { ReportData } from "@/lib/reports/types";

// POST /api/reports/generate - генерировать данные отчёта
export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("Generate report request:", body);
    const config = reportGenerateSchema.parse(body);

    // Определяем период
    const { from, to } = getPeriodDates(
      config.period,
      config.dateFrom,
      config.dateTo
    );

    // Получаем транзакции за период
    let query = supabase
      .from("transactions")
      .select(`
        id,
        occurred_at,
        amount,
        direction,
        category_id,
        account_id,
        description
      `)
      .gte("occurred_at", from)
      .lte("occurred_at", to)
      .order("occurred_at", { ascending: false });

    // Фильтр по типам данных (доходы/расходы)
    const directions: string[] = [];
    if (config.dataTypes.includes("income")) directions.push("income");
    if (config.dataTypes.includes("expense")) directions.push("expense");
    if (directions.length > 0) {
      query = query.in("direction", directions);
    }

    // Фильтр по категориям - НЕ применяем если список пуст (показываем все)
    if (config.categories && config.categories.length > 0) {
      // Включаем выбранные категории И транзакции без категории
      const categoryFilter = `category_id.in.(${config.categories.join(",")}),category_id.is.null`;
      query = query.or(categoryFilter);
    }

    // Фильтр по счетам - НЕ применяем если список пуст (показываем все)
    if (config.accounts && config.accounts.length > 0) {
      // Включаем выбранные счета И транзакции без счёта
      const accountFilter = `account_id.in.(${config.accounts.join(",")}),account_id.is.null`;
      query = query.or(accountFilter);
    }

    // Тип для транзакций из БД
    type TransactionRow = {
      id: string;
      occurred_at: string;
      amount: number;
      direction: string;
      category_id: string | null;
      account_id: string | null;
    };

    const { data: transactions, error } = await query;

    if (error) {
      console.error("Failed to fetch transactions:", error);
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    console.log(`Found ${transactions?.length || 0} transactions`);
    
    // Анализируем типы транзакций
    if (transactions && transactions.length > 0) {
      const directionCounts = transactions.reduce((acc: Record<string, number>, t: TransactionRow) => {
        acc[t.direction] = (acc[t.direction] || 0) + 1;
        return acc;
      }, {});
      console.log("Transaction directions:", directionCounts);
      console.log("Sample transactions:", transactions.slice(0, 3).map((t: TransactionRow) => ({
        direction: t.direction,
        amount: t.amount,
        date: t.occurred_at
      })));
    }

    // Загружаем категории и счета отдельно (только не удалённые)
    const [categoriesRes, accountsRes] = await Promise.all([
      supabase.from("categories").select("id, name").is("deleted_at", null),
      supabase.from("accounts").select("id, name").is("deleted_at", null),
    ]);

    if (categoriesRes.error) {
      console.error("Failed to fetch categories:", categoriesRes.error);
    }
    if (accountsRes.error) {
      console.error("Failed to fetch accounts:", accountsRes.error);
    }

    const categoriesMap = new Map(
      (categoriesRes.data || []).map((c) => [c.id, c.name])
    );
    const accountsMap = new Map(
      (accountsRes.data || []).map((a) => [a.id, a.name])
    );

    // Загружаем позиции товаров для транзакций
    const transactionIds = transactions.map((t: TransactionRow) => t.id);
    
    type TransactionItemRow = {
      transaction_id: string;
      name: string;
      quantity: number;
      unit: string;
      price_per_unit: number;
      total_amount: number;
      category: string | null;
    };
    
    let transactionItems: TransactionItemRow[] = [];
    
    if (transactionIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from("transaction_items")
        .select("transaction_id, name, quantity, unit, price_per_unit, total_amount, category")
        .in("transaction_id", transactionIds);
      
      if (!itemsError && itemsData) {
        transactionItems = itemsData as TransactionItemRow[];
      }
    }

    // Обработка данных
    const reportData: ReportData = {
      summary: {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        transactionCount: transactions?.length || 0,
      },
      byCategory: [],
      byAccount: [],
      byProduct: [],
      timeline: [],
      transactions: [],
    };

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ success: true, data: reportData });
    }

    // Подсчёт итогов
    const categoryMap = new Map<string, { name: string; amount: number; count: number }>();
    const accountMap = new Map<string, { name: string; amount: number; count: number }>();
    const timelineMap = new Map<string, { income: number; expense: number }>();

    transactions.forEach((t: TransactionRow) => {
      const amount = t.amount / 100;

      // Итоги
      if (t.direction === "income") {
        reportData.summary.totalIncome += amount;
      } else if (t.direction === "expense") {
        reportData.summary.totalExpense += amount;
      }

      // По категориям
      const categoryId = t.category_id || "uncategorized";
      const categoryName = t.category_id
        ? categoriesMap.get(t.category_id) || "Без категории"
        : "Без категории";
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, { name: categoryName, amount: 0, count: 0 });
      }
      const catData = categoryMap.get(categoryId)!;
      catData.amount += amount;
      catData.count += 1;

      // По счетам
      const accountId = t.account_id || "unknown";
      const accountName = t.account_id
        ? accountsMap.get(t.account_id) || "Неизвестно"
        : "Неизвестно";
      if (!accountMap.has(accountId)) {
        accountMap.set(accountId, { name: accountName, amount: 0, count: 0 });
      }
      const accData = accountMap.get(accountId)!;
      accData.amount += amount;
      accData.count += 1;

      // Временная шкала
      const date = t.occurred_at.split("T")[0];
      if (!timelineMap.has(date)) {
        timelineMap.set(date, { income: 0, expense: 0 });
      }
      const timeData = timelineMap.get(date)!;
      if (t.direction === "income") {
        timeData.income += amount;
      } else {
        timeData.expense += amount;
      }

      // Транзакции
      reportData.transactions.push({
        id: t.id,
        date: t.occurred_at.split("T")[0],
        description: `${categoryName} (${accountName})`,
        category: categoryName,
        account: accountName,
        amount,
        direction: (t.direction === "income" || t.direction === "expense") ? t.direction : "expense",
      });
    });

    // Баланс
    reportData.summary.balance = reportData.summary.totalIncome - reportData.summary.totalExpense;

    // По категориям (с процентами)
    const total = reportData.summary.totalIncome + reportData.summary.totalExpense;
    categoryMap.forEach((value, key) => {
      reportData.byCategory.push({
        categoryId: key,
        categoryName: value.name,
        amount: value.amount,
        count: value.count,
        percentage: total > 0 ? (value.amount / total) * 100 : 0,
      });
    });
    reportData.byCategory.sort((a, b) => b.amount - a.amount);

    // По счетам
    accountMap.forEach((value, key) => {
      reportData.byAccount.push({
        accountId: key,
        accountName: value.name,
        amount: value.amount,
        count: value.count,
      });
    });
    reportData.byAccount.sort((a, b) => b.amount - a.amount);

    // По товарам
    const productMap = new Map<string, {
      category: string | null;
      totalQuantity: number;
      unit: string;
      totalAmount: number;
      totalPrice: number;
      transactionIds: Set<string>;
    }>();

    transactionItems.forEach((item) => {
      const key = item.name;
      if (!productMap.has(key)) {
        productMap.set(key, {
          category: item.category,
          totalQuantity: 0,
          unit: item.unit,
          totalAmount: 0,
          totalPrice: 0,
          transactionIds: new Set(),
        });
      }
      const productData = productMap.get(key)!;
      productData.totalQuantity += item.quantity;
      productData.totalAmount += item.total_amount / 100; // конвертируем в рубли
      productData.totalPrice += item.price_per_unit / 100; // конвертируем в рубли
      productData.transactionIds.add(item.transaction_id);
    });

    productMap.forEach((value, productName) => {
      const avgPrice = value.transactionIds.size > 0 
        ? value.totalPrice / value.transactionIds.size 
        : 0;
      
      reportData.byProduct.push({
        productName,
        category: value.category,
        quantity: value.totalQuantity,
        unit: value.unit,
        totalAmount: Number(value.totalAmount.toFixed(2)),
        avgPrice: Number(avgPrice.toFixed(2)),
        transactionCount: value.transactionIds.size,
      });
    });
    reportData.byProduct.sort((a, b) => b.totalAmount - a.totalAmount);

    // Временная шкала
    let balance = 0;
    Array.from(timelineMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, values]) => {
        balance += values.income - values.expense;
        reportData.timeline.push({
          date,
          income: values.income,
          expense: values.expense,
          balance,
        });
      });

    console.log("Report generated successfully:", {
      transactions: reportData.transactions.length,
      categories: reportData.byCategory.length,
      totalIncome: reportData.summary.totalIncome,
      totalExpense: reportData.summary.totalExpense,
      balance: reportData.summary.balance,
    });
    
    console.log("Income/Expense breakdown:", {
      incomeTransactions: reportData.transactions.filter(t => t.direction === "income").length,
      expenseTransactions: reportData.transactions.filter(t => t.direction === "expense").length,
    });

    return NextResponse.json({ success: true, data: reportData });
  } catch (error) {
    console.error("POST /api/reports/generate error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error",
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}
