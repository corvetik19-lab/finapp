/**
 * Обработчики инструментов AI - выполняют действия в приложении
 */

import { createAdminClient, createRouteClient } from "@/lib/supabase/helpers";
import type { ToolParameters } from "./tools";
import { searchRelevantTransactions } from "./rag-pipeline";
import { logger } from "@/lib/logger";

type TransactionSummaryRow = {
  amount: number;
  direction: "income" | "expense";
};

type PlanRecord = {
  name: string;
  current_amount?: number | null;
  target_amount?: number | null;
};

type ProgramRecord = {
  name: string;
  is_active?: boolean | null;
  duration?: number | null;
};

// === ДЕБЕТОВЫЕ КАРТЫ ===
export async function handleAddDebitCard(params: ToolParameters<"addDebitCard"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  const { data, error} = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: params.name,
      type: "debit_card",
      balance: Math.round(params.balance * 100), // в копейках
      currency: params.currency || "RUB",
      bank: params.bank || params.name,
      card_number: params.cardNumber || null,
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `Карта "${params.name}" успешно добавлена с балансом ${params.balance} ${params.currency || "RUB"}` };
}

// === КРЕДИТНЫЕ КАРТЫ ===
export async function handleAddCreditCard(params: ToolParameters<"addCreditCard"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: params.name,
      type: "credit_card",
      balance: Math.round(params.balance * 100),
      currency: params.currency || "RUB",
      bank: params.bank || params.name,
      card_number: params.cardNumber || null,
      credit_limit: Math.round(params.creditLimit * 100),
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `Кредитная карта "${params.name}" добавлена. Лимит: ${params.creditLimit} ${params.currency || "RUB"}` };
}

// === ТРАНЗАКЦИИ ===
export async function handleAddTransaction(params: ToolParameters<"addTransaction"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  // Найти счёт по имени
  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null) // Только активные счета
    .ilike("name", `%${params.accountName}%`)
    .single();

  if (!account) {
    return { success: false, message: `Счёт "${params.accountName}" не найден` };
  }

  // Найти или создать категорию
  let categoryId;
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .ilike("name", params.categoryName)
    .single();

  if (category) {
    categoryId = category.id;
  } else {
    // Создать категорию
    const { data: newCategory } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: params.categoryName,
        type: params.direction,
      })
      .select("id")
      .single();
    categoryId = newCategory?.id;
  }

  // Создать транзакцию
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      account_id: account.id,
      category_id: categoryId,
      amount: Math.round(params.amount * 100),
      direction: params.direction,
      description: params.description || "",
      date: params.date || new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) throw error;
  return { 
    success: true, 
    data, 
    message: `Транзакция ${params.direction === "expense" ? "расход" : "доход"} ${params.amount} ₽ добавлена в категорию "${params.categoryName}"` 
  };
}

// === БЮДЖЕТЫ ===
export async function handleAddBudget(params: ToolParameters<"addBudget"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  // Найти категорию
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .ilike("name", params.categoryName)
    .single();

  if (!category) {
    return { success: false, message: `Категория "${params.categoryName}" не найдена` };
  }

  const { data, error } = await supabase
    .from("budgets")
    .insert({
      user_id: userId,
      category_id: category.id,
      amount: Math.round(params.amount * 100),
      period: params.period,
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `Бюджет ${params.amount} ₽ на "${params.categoryName}" создан (период: ${params.period})` };
}

// === ПЛАНЫ ===
export async function handleAddPlan(params: ToolParameters<"addPlan"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  const { data, error } = await supabase
    .from("plans")
    .insert({
      user_id: userId,
      name: params.name,
      target_amount: Math.round(params.targetAmount * 100),
      current_amount: Math.round(params.currentAmount * 100),
      deadline: params.deadline || null,
      type: "savings",
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `План "${params.name}" создан. Цель: ${params.targetAmount} ₽` };
}

// === ЗАКЛАДКИ ===
export async function handleAddBookmark(params: ToolParameters<"addBookmark"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: userId,
      title: params.title,
      url: params.url,
      category: params.category || "general",
      description: params.description || null,
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `Закладка "${params.title}" сохранена` };
}

// === ПРОМПТЫ ===
export async function handleAddPrompt(params: ToolParameters<"addPrompt"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  const { data, error } = await supabase
    .from("prompts")
    .insert({
      user_id: userId,
      title: params.title,
      content: params.content,
      category: params.category || "general",
      tags: params.tags || [],
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `Промпт "${params.title}" сохранён` };
}

// === АНАЛИТИКА ===
export async function handleGetFinancialSummary(params: ToolParameters<"getFinancialSummary"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  // Определить период
  const now = new Date();
  const startDate = new Date();
  
  switch (params.period) {
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }

  // Получить транзакции
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, direction")
    .eq("user_id", userId)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", now.toISOString().split("T")[0]);

  if (!transactions) {
    return { success: false, message: "Не удалось получить данные" };
  }

  const summaryRows: TransactionSummaryRow[] = transactions as TransactionSummaryRow[];

  const income = summaryRows
    .filter((t) => t.direction === "income")
    .reduce((sum, t) => sum + t.amount, 0) / 100;

  const expense = summaryRows
    .filter((t) => t.direction === "expense")
    .reduce((sum, t) => sum + t.amount, 0) / 100;

  const balance = income - expense;

  return {
    success: true,
    data: { income, expense, balance, period: params.period },
    message: `За ${params.period === "week" ? "неделю" : params.period === "month" ? "месяц" : "год"}: доходы ${income} ₽, расходы ${expense} ₽, баланс ${balance} ₽`,
  };
}

// === РАСХОДЫ ПО КАТЕГОРИЯМ ===
export async function handleGetExpensesByCategory(params: ToolParameters<"getExpensesByCategory"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  // Если даты не указаны - берём текущий месяц
  let startDate = params.startDate;
  let endDate = params.endDate;
  
  // Если указан месяц - вычисляем даты
  const paramsWithMonth = params as { month?: string; year?: number; startDate?: string; endDate?: string };
  if (paramsWithMonth.month) {
    const monthNames: Record<string, number> = {
      'январь': 0, 'января': 0,
      'февраль': 1, 'февраля': 1,
      'март': 2, 'марта': 2,
      'апрель': 3, 'апреля': 3,
      'май': 4, 'мая': 4,
      'июнь': 5, 'июня': 5,
      'июль': 6, 'июля': 6,
      'август': 7, 'августа': 7,
      'сентябрь': 8, 'сентября': 8,
      'октябрь': 9, 'октября': 9,
      'ноябрь': 10, 'ноября': 10,
      'декабрь': 11, 'декабря': 11,
    };
    
    const monthName = paramsWithMonth.month.toLowerCase();
    const monthIndex = monthNames[monthName];
    const year = paramsWithMonth.year || new Date().getFullYear();
    
    if (monthIndex !== undefined) {
      startDate = new Date(year, monthIndex, 1).toISOString().split('T')[0];
      endDate = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];
    }
  }
  
  if (!startDate || !endDate) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    
    // Первый день текущего месяца
    startDate = new Date(year, month, 1).toISOString().split('T')[0];
    // Последний день текущего месяца
    endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
  }

  logger.debug("getExpensesByCategory", { startDate, endDate });

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("amount, categories(name), occurred_at")
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("occurred_at", `${startDate}T00:00:00`)
    .lt("occurred_at", `${endDate}T23:59:59.999Z`);

  if (error) {
    logger.error("getExpensesByCategory error:", error);
    return { success: false, message: "Ошибка получения данных: " + error.message };
  }

  if (!transactions || transactions.length === 0) {
    return { 
      success: false, 
      message: `За период с ${startDate} по ${endDate} расходов не найдено. Добавьте транзакции!` 
    };
  }

  // Группировка по категориям
  const byCategory: Record<string, number> = {};
  let total = 0;
  
  transactions.forEach((t: { amount: number; categories: { name: string }[] | { name: string } | null }) => {
    // Supabase может вернуть как объект, так и массив
    const categories = Array.isArray(t.categories) ? t.categories[0] : t.categories;
    const catName = categories?.name || "Без категории";
    const amountRub = Math.abs(t.amount) / 100;
    byCategory[catName] = (byCategory[catName] || 0) + amountRub;
    total += amountRub;
  });

  // Сортируем по убыванию суммы
  const sorted = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => `${name}: ${amount.toLocaleString('ru-RU')} ₽`)
    .join("\n");

  return {
    success: true,
    data: { byCategory, total, startDate, endDate, count: transactions.length },
    message: `📊 Расходы за период ${startDate} — ${endDate}:\n\n${sorted}\n\n💰 Общая сумма: ${total.toLocaleString('ru-RU')} ₽\n📝 Транзакций: ${transactions.length}`,
  };
}

// === БАЛАНС СЧЕТОВ ===
export async function handleGetAccountBalance(
  params: ToolParameters<"getAccountBalance"> & { userId?: string }
) {
  const supabase = createAdminClient(); // Service Role - обход RLS
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  const userId = params.userId;

  const query = supabase
    .from("accounts")
    .select("name, balance, currency")
    .eq("user_id", userId)
    .is("deleted_at", null); // Исключаем удаленные счета

  if (params.accountName && params.accountName !== "all") {
    query.ilike("name", `%${params.accountName}%`);
  }

  const { data: accounts } = await query;

  if (!accounts || accounts.length === 0) {
    return { success: false, message: "Счета не найдены" };
  }

  const summary = accounts
    .map(acc => `${acc.name}: ${acc.balance / 100} ${acc.currency}`)
    .join(", ");

  const total = accounts.reduce((sum, acc) => sum + acc.balance, 0) / 100;

  return {
    success: true,
    data: { accounts, total },
    message: params.accountName === "all" 
      ? `Все счета: ${summary}. Общий баланс: ${total} ₽`
      : summary,
  };
}

// === ДОБАВИТЬ КАТЕГОРИЮ (AI) ===
export async function handleAddCategory(
  params: ToolParameters<"addCategory"> & { userId?: string }
) {
  const supabase = createAdminClient(); // Service Role - обход RLS
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  const userId = params.userId;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: params.name,
      kind: params.type, // В БД поле называется kind, а не type
      // icon колонки нет в БД
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `✅ Категория "${params.name}" успешно создана!` };
}

// === ДОБАВИТЬ ТРАНЗАКЦИЮ (AI) ===
export async function handleAIAddTransaction(
  params: { amount: number; direction: string; categoryName: string; accountName?: string; note?: string; date?: string; userId?: string }
) {
  const supabase = createAdminClient();
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  const userId = params.userId;

  // Найти или создать первый счёт пользователя
  let accountId;
  if (params.accountName) {
    const { data: account } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .ilike("name", `%${params.accountName}%`)
      .single();
    accountId = account?.id;
  }
  
  if (!accountId) {
    // Взять первый доступный счёт или создать новый
    const { data: firstAccount } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .limit(1)
      .single();
    
    if (firstAccount) {
      accountId = firstAccount.id;
    } else {
      // Создать дефолтный счёт
      const { data: newAccount } = await supabase
        .from("accounts")
        .insert({
          user_id: userId,
          name: "Основной счёт",
          type: "cash",
          currency: "RUB"
        })
        .select("id")
        .single();
      accountId = newAccount?.id;
    }
  }

  // Найти или создать категорию
  let categoryId;
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", params.categoryName)
    .single();

  if (category) {
    categoryId = category.id;
  } else {
    // Создать категорию
    const { data: newCategory } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: params.categoryName,
        kind: params.direction,
      })
      .select("id")
      .single();
    categoryId = newCategory?.id;
  }

  // Сумма в БД хранится в копейках (bigint)
  const amountInCents = Math.round(params.amount * 100);
  
  // Создать транзакцию
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      account_id: accountId,
      category_id: categoryId,
      amount: amountInCents,
      direction: params.direction,
      currency: "RUB",
      note: params.note || null,
      occurred_at: params.date ? new Date(params.date).toISOString() : new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  
  const directionText = params.direction === "expense" ? "Расход" : "Доход";
  return { 
    success: true, 
    data, 
    message: `✅ ${directionText} ${params.amount} ₽ добавлен в "${params.categoryName}"` 
  };
}

// === ДОБАВИТЬ СЧЁТ (AI) ===
export async function handleAIAddAccount(
  params: { name: string; type: string; currency?: string; userId?: string }
) {
  const supabase = createAdminClient();
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  const userId = params.userId;

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: params.name,
      type: params.type,
      currency: params.currency || "RUB",
      archived: false
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `✅ Счёт "${params.name}" создан!` };
}

// === ДОБАВИТЬ БЮДЖЕТ (AI) ===
export async function handleAIAddBudget(
  params: { categoryName: string; amount: number; period?: string; userId?: string }
) {
  const supabase = createAdminClient();
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  const userId = params.userId;

  // Найти категорию
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", params.categoryName)
    .single();

  if (!category) {
    return { success: false, message: `❌ Категория "${params.categoryName}" не найдена. Сначала создай её!` };
  }

  // Определить период
  const now = new Date();
  let periodStart, periodEnd;
  
  if (params.period === "year") {
    periodStart = new Date(now.getFullYear(), 0, 1);
    periodEnd = new Date(now.getFullYear(), 11, 31);
  } else if (params.period === "quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    periodStart = new Date(now.getFullYear(), quarter * 3, 1);
    periodEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
  } else {
    // month по умолчанию
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  const amountInCents = Math.round(params.amount * 100);

  const { data, error } = await supabase
    .from("budgets")
    .insert({
      user_id: userId,
      category_id: category.id,
      limit_amount: amountInCents,
      currency: "R", // single char в БД
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) throw error;
  
  const periodText = params.period === "year" ? "год" : params.period === "quarter" ? "квартал" : "месяц";
  return { 
    success: true, 
    data, 
    message: `✅ Бюджет ${params.amount} ₽ на "${params.categoryName}" установлен на ${periodText}!` 
  };
}

// === ПОЛУЧИТЬ ТРАНЗАКЦИИ (AI) ===
export async function handleAIGetTransactions(
  params: { limit?: number; categoryName?: string; userId?: string }
) {
  try {
    logger.debug("getTransactions called", { params });
    const supabase = createAdminClient();
    
    if (!params.userId) {
      logger.error("❌ No userId provided");
      return {
        success: false,
        message: "❌ Ошибка: userId не указан"
      };
    }
    
    const userId = params.userId;
    const limit = params.limit || 10;
    logger.debug("Using userId and limit", { userId, limit });

    // Упрощённый запрос без вложенных связей
    let query = supabase
      .from("transactions")
      .select(`
        id,
        amount,
        direction,
        currency,
        occurred_at,
        note,
        category_id,
        account_id
      `)
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (params.categoryName) {
      // Сначала найти ID категории
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", params.categoryName)
        .single();
      
      if (category) {
        query = query.eq("category_id", category.id);
      }
    }

    const { data: transactions, error } = await query;

    if (error) {
      logger.error("❌ Supabase error in getTransactions:", error);
      return {
        success: false,
        message: `❌ Ошибка БД: ${error.message}`
      };
    }
    
    logger.debug("Transactions fetched", { count: transactions?.length || 0 });
    
    if (!transactions || transactions.length === 0) {
      logger.debug("No transactions found");
      return { 
        success: true, 
        data: [], 
        message: "📭 Транзакций пока нет. Добавь первую трату или доход!" 
      };
    }

    // Получаем категории и счета отдельными запросами
    const categoryIds = [...new Set(transactions.map(t => t.category_id).filter(Boolean))];
    const accountIds = [...new Set(transactions.map(t => t.account_id).filter(Boolean))];

    let categories: Array<{ id: string; name: string }> = [];
    let accounts: Array<{ id: string; name: string }> = [];

    // Запрашиваем категории только если есть ID
    if (categoryIds.length > 0) {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .in("id", categoryIds);
      categories = data || [];
    }

    // Запрашиваем счета только если есть ID
    if (accountIds.length > 0) {
      const { data } = await supabase
        .from("accounts")
        .select("id, name")
        .in("id", accountIds);
      accounts = data || [];
    }

    // Создаём маппинги
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  
  const records = transactions.map(t => ({
    date: t.occurred_at,
    amount: t.amount,
    direction: t.direction,
    currency: t.currency,
    note: t.note,
    categories: { name: categoryMap.get(t.category_id) || null },
    accounts: { name: accountMap.get(t.account_id) || null }
  }));

  if (records.length === 0) {
    return { 
      success: true, 
      data: [], 
      message: "📭 Транзакций пока нет. Добавь первую трату или доход!" 
    };
  }

  // Форматируем для ответа
  const formatted = records.map((t) => ({
    date: new Date(t.date).toLocaleDateString('ru-RU'),
    amount: (t.amount / 100).toFixed(2),
    direction: t.direction === 'expense' ? 'расход' : 'доход',
    category: t.categories?.name || 'Без категории',
    account: t.accounts?.name || 'Неизвестный счёт',
    note: t.note || ''
  }));

  const summary = formatted.map((t) => 
    `${t.date}: ${t.direction} ${t.amount} ₽ (${t.category}${t.note ? ` - ${t.note}` : ''})`
  ).join('\n');

  return { 
    success: true, 
    data: formatted, 
    message: `📊 Последние транзакции:\n\n${summary}` 
  };
  } catch (error) {
    logger.error("❌ Unexpected error in getTransactions:", error);
    return {
      success: false,
      message: `❌ Непредвиденная ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// === УПРАВЛЕНИЕ ПЛАНАМИ (расширенное) ===
export async function handleGetPlans(params: ToolParameters<"getPlans"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  let query = supabase
    .from("plans")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: plansData } = await query;

  if (!plansData || plansData.length === 0) {
    return { success: true, data: [], message: "У вас пока нет планов" };
  }

  const plans: PlanRecord[] = plansData as PlanRecord[];

  const summary = plans.map((p) => 
    `${p.name}: ${(p.current_amount || 0) / 100} / ${(p.target_amount || 0) / 100} ₽ (${Math.round(((p.current_amount || 0) / (p.target_amount || 1)) * 100)}%)`
  ).join(", ");

  return {
    success: true,
    data: plans,
    message: `Ваши планы: ${summary}`,
  };
}

export async function handleUpdatePlan(params: ToolParameters<"updatePlan"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  const updates: Record<string, unknown> = {};
  if (params.name) updates.name = params.name;
  if (params.targetAmount !== undefined) updates.target_amount = Math.round(params.targetAmount * 100);
  if (params.currentAmount !== undefined) updates.current_amount = Math.round(params.currentAmount * 100);
  if (params.deadline) updates.deadline = params.deadline;
  if (params.status) updates.status = params.status;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("plans")
    .update(updates)
    .eq("id", params.planId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `План "${data.name}" обновлён` };
}

export async function handleDeletePlan(params: ToolParameters<"deletePlan"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  const { error } = await supabase
    .from("plans")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.planId)
    .eq("user_id", userId);

  if (error) throw error;
  return { success: true, message: "План удалён" };
}

export async function handleAddPlanTopup(params: ToolParameters<"addPlanTopup"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  // Получить текущую сумму плана
  const { data: plan } = await supabase
    .from("plans")
    .select("current_amount, name")
    .eq("id", params.planId)
    .eq("user_id", userId)
    .is("deleted_at", null) // Только активные планы
    .single();

  if (!plan) {
    return { success: false, message: "План не найден" };
  }

  const newAmount = (plan.current_amount || 0) + Math.round(params.amount * 100);

  // Обновить сумму
  const { error } = await supabase
    .from("plans")
    .update({ current_amount: newAmount })
    .eq("id", params.planId);

  if (error) throw error;

  // Записать пополнение
  await supabase
    .from("plan_topups")
    .insert({
      user_id: userId,
      plan_id: params.planId,
      amount: Math.round(params.amount * 100),
      description: params.description || "",
    });

  return { 
    success: true, 
    message: `Пополнено ${params.amount} ₽. Текущая сумма: ${newAmount / 100} ₽` 
  };
}

// === ФИТНЕС ПРОГРАММЫ ===
export async function handleGetFitnessPrograms(params: ToolParameters<"getFitnessPrograms"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  let query = supabase
    .from("fitness_programs")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.active === true) {
    query = query.eq("is_active", true);
  }

  const { data: programsData } = await query;

  if (!programsData || programsData.length === 0) {
    return { success: true, data: [], message: "У вас пока нет фитнес-программ" };
  }

  const programs: ProgramRecord[] = programsData as ProgramRecord[];

  const summary = programs.map((p) => 
    `${p.name}${p.is_active ? ' (активна)' : ''}: ${p.duration || 'без срока'} дней`
  ).join(", ");

  return {
    success: true,
    data: programs,
    message: `Ваши программы: ${summary}`,
  };
}

export async function handleAddFitnessProgram(params: ToolParameters<"addFitnessProgram"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  const { data, error } = await supabase
    .from("fitness_programs")
    .insert({
      user_id: userId,
      name: params.name,
      description: params.description || null,
      duration: params.duration || null,
      frequency: params.frequency || null,
      goal: params.goal || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `Программа "${params.name}" создана` };
}

export async function handleUpdateFitnessProgram(params: ToolParameters<"updateFitnessProgram"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  const updates: Record<string, unknown> = {};
  if (params.name) updates.name = params.name;
  if (params.description !== undefined) updates.description = params.description;
  if (params.duration !== undefined) updates.duration = params.duration;
  if (params.frequency !== undefined) updates.frequency = params.frequency;
  if (params.goal !== undefined) updates.goal = params.goal;
  if (params.isActive !== undefined) updates.is_active = params.isActive;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("fitness_programs")
    .update(updates)
    .eq("id", params.programId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `Программа "${data.name}" обновлена` };
}

export async function handleDeleteFitnessProgram(params: ToolParameters<"deleteFitnessProgram"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  const { error } = await supabase
    .from("fitness_programs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.programId)
    .eq("user_id", userId);

  if (error) throw error;
  return { success: true, message: "Программа удалена" };
}

export async function handleAddFitnessWorkout(params: ToolParameters<"addFitnessWorkout"> & { userId: string }) {
  const supabase = await createRouteClient();
  const userId = params.userId;

  const { data, error } = await supabase
    .from("fitness_workouts")
    .insert({
      user_id: userId,
      program_id: params.programId,
      date: params.date || new Date().toISOString().split("T")[0],
      duration: params.duration,
      exercises: params.exercises || null,
      notes: params.notes || null,
      calories: params.calories || null,
    })
    .select()
    .single();

  if (error) throw error;
  return { 
    success: true, 
    data, 
    message: `Тренировка записана: ${params.duration} мин${params.calories ? `, ${params.calories} ккал` : ''}` 
  };
}

// === ЗАМЕТКИ (AI) ===
export async function handleAIAddNote(
  params: { title: string; content: string; userId?: string }
) {
  const supabase = createAdminClient();
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: params.userId,
      title: params.title,
      content: params.content
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `✅ Заметка "${params.title}" создана!` };
}

export async function handleAIGetNotes(
  params: { limit?: number; userId?: string }
) {
  const supabase = createAdminClient();
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  const limit = params.limit || 10;
  
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, created_at")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  
  if (!data || data.length === 0) {
    return { success: true, data: [], message: "📝 Заметок пока нет. Создай первую!" };
  }
  
  const summary = data.map(n => 
    `"${n.title}" (${new Date(n.created_at).toLocaleDateString('ru-RU')})`
  ).join('\n');
  
  return { success: true, data, message: `📝 Твои заметки:\n\n${summary}` };
}

// === ПЛАНЫ (AI) ===
export async function handleAIAddPlan(
  params: { name: string; goalAmount: number; targetDate?: string; description?: string; userId?: string }
) {
  const supabase = createAdminClient();
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  const amountInCents = Math.round(params.goalAmount * 100);
  
  const { data, error } = await supabase
    .from("plans")
    .insert({
      user_id: params.userId,
      name: params.name,
      goal_amount: amountInCents,
      currency: "R",
      target_date: params.targetDate || null,
      description: params.description || null,
      plan_type: "savings"
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `✅ План "${params.name}" с целью ${params.goalAmount} ₽ создан!` };
}

export async function handleAIGetPlans(
  params: { userId?: string }
) {
  const supabase = createAdminClient();
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, goal_amount, target_date, plan_type")
    .eq("user_id", params.userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  
  if (!data || data.length === 0) {
    return { success: true, data: [], message: "🎯 Планов пока нет. Создай первый!" };
  }
  
  const summary = data.map(p => 
    `"${p.name}" - цель ${(p.goal_amount / 100).toFixed(0)} ₽${p.target_date ? ` до ${new Date(p.target_date).toLocaleDateString('ru-RU')}` : ''}`
  ).join('\n');
  
  return { success: true, data, message: `🎯 Твои планы:\n\n${summary}` };
}

// === ЗАКЛАДКИ (AI) ===
export async function handleAIAddBookmark(
  params: { title: string; url: string; description?: string; userId?: string }
) {
  const supabase = createAdminClient();
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: params.userId,
      title: params.title,
      url: params.url,
      description: params.description || null
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `✅ Закладка "${params.title}" сохранена!` };
}

// === ПРОМПТЫ (AI) ===
export async function handleAIAddPrompt(
  params: { title: string; content: string; category?: string; userId?: string }
) {
  const supabase = createAdminClient();
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  const { data, error } = await supabase
    .from("prompts")
    .insert({
      user_id: params.userId,
      title: params.title,
      content: params.content,
      category: params.category || "general"
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `✅ Промпт "${params.title}" сохранён!` };
}

// === ФИТНЕС (AI) ===
export async function handleAIAddWorkout(
  params: { programName: string; duration: number; calories?: number; note?: string; userId?: string }
) {
  const supabase = createAdminClient();
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  // Найти программу или создать дефолтную
  let programId;
  const { data: program } = await supabase
    .from("fitness_programs")
    .select("id")
    .eq("user_id", params.userId)
    .ilike("name", `%${params.programName}%`)
    .single();
  
  if (program) {
    programId = program.id;
  } else {
    // Создать дефолтную программу
    const { data: newProgram } = await supabase
      .from("fitness_programs")
      .insert({
        user_id: params.userId,
        name: params.programName,
        description: "Автоматически создано AI"
      })
      .select("id")
      .single();
    programId = newProgram?.id;
  }
  
  const { data, error } = await supabase
    .from("fitness_workouts")
    .insert({
      user_id: params.userId,
      program_id: programId,
      duration: params.duration,
      calories: params.calories || null,
      notes: params.note || null,
      completed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return { 
    success: true, 
    data, 
    message: `✅ Тренировка "${params.programName}" записана: ${params.duration} мин${params.calories ? `, ${params.calories} ккал` : ''}!` 
  };
}

// === RAG: УМНЫЙ ПОИСК ТРАНЗАКЦИЙ ===
export async function handleSearchTransactions(params: { query: string; limit?: number; userId: string }) {
  try {
    const results = await searchRelevantTransactions(params.query, params.userId, params.limit || 5);
    
    if (results.length === 0) {
      return {
        success: true,
        message: "Транзакции не найдены по запросу",
        transactions: []
      };
    }

    // Форматируем результаты для AI
    const formatted = results.map(t => ({
      дата: new Date(t.occurred_at).toLocaleDateString("ru-RU"),
      описание: t.note,
      сумма: `${t.amount_major.toFixed(2)} ${t.currency}`,
      категория: t.category_name || "Без категории",
      счет: t.account_name || "Неизвестно",
      схожесть: `${(t.similarity * 100).toFixed(0)}%`
    }));

    return {
      success: true,
      message: `Найдено ${results.length} транзакций`,
      transactions: formatted
    };
  } catch (error) {
    logger.error("Error in handleSearchTransactions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ошибка поиска"
    };
  }
}

// Маппинг обработчиков для AI
export const toolHandlers = {
  // RAG Tools
  searchTransactions: handleSearchTransactions,
  
  // AI Tools (используют Admin Client)
  addCategory: handleAddCategory,
  addTransaction: handleAIAddTransaction,
  addAccount: handleAIAddAccount,
  addBudget: handleAIAddBudget,
  getTransactions: handleAIGetTransactions,
  getAccountBalance: handleGetAccountBalance,
  
  // Заметки
  addNote: handleAIAddNote,
  getNotes: handleAIGetNotes,
  
  // Планы
  addPlan: handleAIAddPlan,
  getPlans: handleAIGetPlans,
  
  // Закладки
  addBookmark: handleAIAddBookmark,
  
  // Промпты
  addPrompt: handleAIAddPrompt,
  
  // Фитнес
  addWorkout: handleAIAddWorkout,
  
  // Legacy handlers (для совместимости)
  addDebitCard: handleAddDebitCard,
  addCreditCard: handleAddCreditCard,
  getFinancialSummary: handleGetFinancialSummary,
  getExpensesByCategory: handleGetExpensesByCategory,
  updatePlan: handleUpdatePlan,
  deletePlan: handleDeletePlan,
  addPlanTopup: handleAddPlanTopup,
  getFitnessPrograms: handleGetFitnessPrograms,
  addFitnessProgram: handleAddFitnessProgram,
  updateFitnessProgram: handleUpdateFitnessProgram,
  deleteFitnessProgram: handleDeleteFitnessProgram,
  addFitnessWorkout: handleAddFitnessWorkout,
  
  // Дополнительные функции просмотра
  getCategories: async (params: { userId: string }) => {
    const supabase = createAdminClient();
    const { data: categories } = await supabase
      .from("categories")
      .select("name, type, icon")
      .eq("user_id", params.userId)
      .is("deleted_at", null);
    
    if (!categories || categories.length === 0) {
      return { success: false, message: "У вас пока нет категорий. Создайте категорию командой вида 'Создай категорию расходов Еда'" };
    }
    
    const income = categories.filter(c => c.type === "income").map(c => `${c.icon || "💰"} ${c.name}`).join(", ");
    const expense = categories.filter(c => c.type === "expense").map(c => `${c.icon || "💸"} ${c.name}`).join(", ");
    
    return { 
      success: true, 
      data: categories,
      message: `📊 Категории:\n\nДоходы: ${income || "нет"}\nРасходы: ${expense || "нет"}` 
    };
  },
  
  getAccounts: async (params: { userId: string }) => {
    const supabase = createAdminClient();
    const { data: accounts } = await supabase
      .from("accounts")
      .select("name, type, balance, currency")
      .eq("user_id", params.userId)
      .is("deleted_at", null);
    
    if (!accounts || accounts.length === 0) {
      return { success: false, message: "У вас нет счетов. Добавьте счёт в разделе Карты или командой 'Добавь счёт'" };
    }
    
    const summary = accounts.map(a => `${a.name} (${a.type}): ${a.balance / 100} ${a.currency}`).join("\n");
    const total = accounts.reduce((sum, a) => sum + a.balance, 0) / 100;
    
    return { 
      success: true, 
      data: { accounts, total },
      message: `💳 Ваши счета:\n\n${summary}\n\n💰 Общий баланс: ${total} ₽` 
    };
  },
  
  getBudgets: async (params: { userId: string }) => {
    const supabase = createAdminClient();
    const { data: budgets } = await supabase
      .from("budgets")
      .select("*, categories(name)")
      .eq("user_id", params.userId)
      .is("deleted_at", null);
    
    if (!budgets || budgets.length === 0) {
      return { success: false, message: "У вас нет бюджетов. Установите бюджет командой вида 'Поставь бюджет 10000 на Еду'" };
    }
    
    const summary = budgets.map((b: { categories?: { name?: string }; spent?: number; amount: number }) => {
      const categoryName = b.categories?.name || "Без категории";
      const spent = b.spent ? b.spent / 100 : 0;
      const limit = b.amount / 100;
      const percent = Math.round((spent / limit) * 100);
      return `${categoryName}: ${spent} / ${limit} ₽ (${percent}%)`;
    }).join("\n");
    
    return { 
      success: true, 
      data: budgets,
      message: `📊 Ваши бюджеты:\n\n${summary}` 
    };
  },
  getBookmarks: async () => ({ success: true, message: "Функция в разработке" }),
  deleteTransaction: async () => ({ success: true, message: "Функция в разработке" }),
  deleteCategory: async () => ({ success: true, message: "Функция в разработке" }),
  deleteAccount: async () => ({ success: true, message: "Функция в разработке" }),
  deleteBudget: async () => ({ success: true, message: "Функция в разработке" }),
  deleteNote: async () => ({ success: true, message: "Функция в разработке" }),
  deleteBookmark: async () => ({ success: true, message: "Функция в разработке" }),
  updateTransaction: async () => ({ success: true, message: "Функция в разработке" }),
  updateCategory: async () => ({ success: true, message: "Функция в разработке" }),
  updateBudget: async () => ({ success: true, message: "Функция в разработке" }),
  updateAccount: async () => ({ success: true, message: "Функция в разработке" }),
  updateNote: async () => ({ success: true, message: "Функция в разработке" }),
  getSpendingByMonth: async () => ({ success: true, message: "Функция в разработке" }),
  getTopCategories: async () => ({ success: true, message: "Функция в разработке" }),
  getNetWorth: async () => ({ success: true, message: "Функция в разработке" }),
  getMonthlyTrends: async () => ({ success: true, message: "Функция в разработке" }),
  
  // Обработка чеков
  processReceipt: async (params: { receiptText: string; accountName?: string; userId: string; preview?: boolean }) => {
    try {
      const supabase = createAdminClient();
      const { receiptText, userId, accountName } = params;

      logger.debug("Processing receipt for user", { userId });

      // 1. Парсим чек используя OpenAI
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return { success: false, message: "OpenAI API ключ не настроен" };
      }

      const parsePrompt = `Проанализируй кассовый чек и верни JSON с такой структурой:
{
  "storeName": "название магазина",
  "date": "дата в формате YYYY-MM-DD (например 2025-11-07)",
  "items": [
    {
      "name": "название товара",
      "quantity": число,
      "pricePerUnit": цена_за_единицу_в_рублях,
      "total": общая_сумма_в_рублях
    }
  ],
  "totalAmount": общая_сумма_чека_в_рублях
}

ВАЖНО: Дата должна быть строго в формате YYYY-MM-DD (год-месяц-день).

Чек:
${receiptText}`;

      const parseResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: parsePrompt }],
          response_format: { type: "json_object" }
        })
      });

      if (!parseResponse.ok) {
        return { success: false, message: "Ошибка парсинга чека" };
      }

      const parseData = await parseResponse.json();
      const parsed = JSON.parse(parseData.choices[0].message.content);
      
      logger.debug("Raw parsed data", { parsed });
      
      // Проверяем и исправляем дату если нужно
      let finalDate = new Date().toISOString().split('T')[0]; // По умолчанию сегодня
      
      if (parsed.date) {
        // Если дата в формате DD.MM.YYYY, конвертируем в YYYY-MM-DD
        if (parsed.date.includes('.')) {
          const parts = parsed.date.split('.');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            finalDate = `${year}-${month}-${day}`;
          }
        } else if (parsed.date.includes('-')) {
          // Уже в формате YYYY-MM-DD или подобном
          finalDate = parsed.date;
        }
        
        // Валидация: проверяем что дата не в прошлом больше чем на 1 год
        const parsedDateObj = new Date(finalDate);
        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        
        if (parsedDateObj < oneYearAgo || parsedDateObj > now) {
          console.warn(`⚠️ Invalid date detected: ${finalDate}, using today instead`);
          finalDate = now.toISOString().split('T')[0];
        }
      }
      
      parsed.date = finalDate;
      logger.debug("Parsed receipt with corrected date", { date: parsed.date });

      // Получаем все товары из БД для сопоставления (нужно и для preview, и для сохранения)
      const { data: products, error: productsError } = await supabase
        .from("product_items")
        .select("id, name, category_id, default_unit, categories(id, name, kind)")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (productsError) {
        logger.error("❌ Products query error:", productsError);
      }

      if (!products || products.length === 0) {
        return {
          success: false,
          message: `❌ В системе нет активных товаров. Добавьте товары в разделе "Настройки" → "Товары"`
        };
      }

      // Сопоставляем товары из чека с товарами в БД
      const matchResults: Array<{ 
        receiptItem: typeof parsed.items[0], 
        matchedProduct: typeof products[0] | null 
      }> = [];

      for (const item of parsed.items) {
        const itemNameLower = item.name.toLowerCase();
        
        // 1. Точное совпадение
        let foundProduct = products.find((p: { name: string }) => 
          p.name.toLowerCase() === itemNameLower
        );

        // 2. Частичное совпадение
        if (!foundProduct) {
          foundProduct = products.find((p: { name: string }) => {
            const pNameLower = p.name.toLowerCase();
            return pNameLower.includes(itemNameLower) || itemNameLower.includes(pNameLower);
          });
        }

        matchResults.push({ receiptItem: item, matchedProduct: foundProduct || null });
      }

      // Если режим preview, возвращаем данные с сопоставлением
      if (params.preview) {
        return {
          success: true,
          preview: true,
          data: {
            storeName: parsed.storeName,
            date: parsed.date,
            items: matchResults.map(r => {
              // Получаем категорию из matchedProduct
              let categoryName = null;
              const product = r.matchedProduct as unknown as { categories?: { name: string } | Array<{ name: string }> };
              
              if (product?.categories) {
                // categories может быть массивом или объектом
                if (Array.isArray(product.categories) && product.categories.length > 0) {
                  categoryName = product.categories[0].name;
                } else if (typeof product.categories === 'object' && 'name' in product.categories) {
                  categoryName = product.categories.name;
                }
              }
              
              return {
                receiptName: r.receiptItem.name,
                quantity: r.receiptItem.quantity,
                pricePerUnit: r.receiptItem.pricePerUnit,
                total: r.receiptItem.total,
                matchedProductId: r.matchedProduct?.id || null,
                matchedProductName: r.matchedProduct?.name || null,
                categoryId: r.matchedProduct?.category_id || null,
                categoryName
              };
            }),
            totalAmount: parsed.totalAmount,
            availableProducts: products.map(p => {
              let categoryName = null;
              const product = p as unknown as { categories?: { name: string } | Array<{ name: string }> };
              
              if (product?.categories) {
                if (Array.isArray(product.categories) && product.categories.length > 0) {
                  categoryName = product.categories[0].name;
                } else if (typeof product.categories === 'object' && 'name' in product.categories) {
                  categoryName = product.categories.name;
                }
              }
              
              return {
                id: p.id,
                name: p.name,
                categoryId: p.category_id,
                categoryName,
                defaultUnit: p.default_unit || "шт"
              };
            })
          },
          message: "Предпросмотр чека готов"
        };
      }

      // 2. Находим или создаём счёт
      let account;
      if (accountName) {
        const { data: accounts } = await supabase
          .from("accounts")
          .select("id, name")
          .eq("user_id", userId)
          .ilike("name", `%${accountName}%`)
          .is("deleted_at", null)
          .limit(1);
        account = accounts?.[0];
      }
      
      if (!account) {
        const { data: accounts } = await supabase
          .from("accounts")
          .select("id, name")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .limit(1);
        account = accounts?.[0];
      }

      if (!account) {
        return { success: false, message: "Счёт не найден. Создайте счёт сначала." };
      }

      // 3. Создаём транзакцию
      const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          account_id: account.id,
          direction: "expense",
          amount: -Math.round(parsed.totalAmount * 100), // в копейках, отрицательная
          currency: "RUB",
          occurred_at: parsed.date || new Date().toISOString(),
          note: `Покупка в ${parsed.storeName}`,
          counterparty: parsed.storeName
        })
        .select()
        .single();

      if (txError || !transaction) {
        logger.error("Transaction error:", txError);
        return { success: false, message: "Ошибка создания транзакции: " + txError?.message };
      }

      logger.debug("Transaction created", { transactionId: transaction.id });

      // 4. Используем уже загруженные товары и результаты сопоставления
      logger.debug("Using products from DB", { count: products.length });

      const addedItems = [];
      const notFoundItems = [];

      // 6. Для не найденных товаров используем AI с умным промптом
      const unmatchedItems = matchResults.filter(r => !r.matchedProduct);
      
      if (unmatchedItems.length > 0 && products.length > 0) {
        const batchMatchPrompt = `Ты эксперт по сопоставлению товаров. Твоя задача - найти соответствие между длинными названиями из чека и короткими названиями в БД.

ТОВАРЫ ИЗ ЧЕКА (длинные названия):
${unmatchedItems.map((r, idx) => `${idx + 1}. ${r.receiptItem.name}`).join('\n')}

ТОВАРЫ В БД (короткие названия):
${products.map((p: { name: string }, idx: number) => `${idx + 1}. ${p.name}`).join('\n')}

ПРАВИЛА СОПОСТАВЛЕНИЯ:
- Ищи ключевые слова и смысл, игнорируй бренды, вес, объём
- "Онигири Фуджи с Креветкой 120г" → "Онигири" (ключевое слово)
- "Батончик Корнлайн кокос 30г" → "Батончик" (категория продукта)
- "Жевательная резинка Ментос мята свежая" → "Жевательная резинка" (основной продукт)
- "Coca-Cola Zero 0.5л" → "Кола" (напиток)
- "Молоко Простоквашино 3.2%" → "Молоко" (продукт)

Верни JSON: {"matches": [{"checkIndex": 1, "dbIndex": 2, "confidence": 0.95}, ...]}
где checkIndex - номер из чека (1-based), dbIndex - номер из БД (1-based, или 0 если не уверен), confidence - уверенность 0-1.
Сопоставляй только если уверенность > 0.7`;

        try {
          const batchResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: batchMatchPrompt }],
              response_format: { type: "json_object" },
              temperature: 0.3
            })
          });

          if (batchResponse.ok) {
            const batchData = await batchResponse.json();
            const result = JSON.parse(batchData.choices[0].message.content);
            
            // Применяем результаты AI-сопоставления
            if (result.matches && Array.isArray(result.matches)) {
              for (const match of result.matches) {
                const checkIdx = match.checkIndex - 1;
                const dbIdx = match.dbIndex - 1;
                const confidence = match.confidence || 0;
                
                if (confidence > 0.7 && checkIdx >= 0 && checkIdx < unmatchedItems.length && dbIdx >= 0 && dbIdx < products.length) {
                  const resultIdx = matchResults.findIndex(r => r.receiptItem === unmatchedItems[checkIdx].receiptItem);
                  if (resultIdx !== -1) {
                    matchResults[resultIdx].matchedProduct = products[dbIdx];
                    logger.debug("AI matched item", { confidence: Math.round(confidence * 100), receiptItem: unmatchedItems[checkIdx].receiptItem.name, product: products[dbIdx].name });
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.error("Batch AI matching error:", error);
        }
      }

      // 7. Добавляем все найденные позиции в БД и собираем категории
      const categoryCounts = new Map<string, number>();
      
      for (const result of matchResults) {
        if (result.matchedProduct) {
          const { error: itemError } = await supabase
            .from("transaction_items")
            .insert({
              user_id: userId,
              transaction_id: transaction.id,
              name: result.matchedProduct.name, // Используем короткое название из БД
              quantity: result.receiptItem.quantity,
              unit: 'шт',
              price_per_unit: Math.round(result.receiptItem.pricePerUnit * 100),
              total_amount: Math.round(result.receiptItem.total * 100),
              category_id: result.matchedProduct.category_id || null, // Категория товара
              product_id: result.matchedProduct.id // Связь с товаром из справочника
            });

          if (!itemError) {
            const productWithCategory = result.matchedProduct as { name: string; category_id?: string | null; categories?: { name?: string } };
            const categoryName = productWithCategory.categories?.name || '';
            addedItems.push(`✅ ${result.receiptItem.name} → ${result.matchedProduct.name}${categoryName ? ` (${categoryName})` : ''}`);
            
            // Подсчитываем категории для определения основной категории транзакции
            if (result.matchedProduct.category_id) {
              const count = categoryCounts.get(result.matchedProduct.category_id) || 0;
              categoryCounts.set(result.matchedProduct.category_id, count + 1);
            }
          } else {
            logger.error("Item insert error:", itemError);
          }
        } else {
          notFoundItems.push(result.receiptItem.name);
        }
      }

      // 7.1. Определяем категорию транзакции по наиболее частой категории товаров
      if (categoryCounts.size > 0) {
        let mostFrequentCategoryId: string | null = null;
        let maxCount = 0;
        
        for (const [categoryId, count] of categoryCounts.entries()) {
          if (count > maxCount) {
            maxCount = count;
            mostFrequentCategoryId = categoryId;
          }
        }
        
        if (mostFrequentCategoryId) {
          await supabase
            .from("transactions")
            .update({ category_id: mostFrequentCategoryId })
            .eq("id", transaction.id);
          
          logger.debug("Transaction category set", { categoryId: mostFrequentCategoryId });
        }
      }

      // 5. Обновляем баланс счёта (пересчитываем)
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

      const summary = `✅ Чек обработан!\n\n` +
        `🏪 Магазин: ${parsed.storeName}\n` +
        `📅 Дата: ${parsed.date}\n` +
        `💰 Сумма: ${parsed.totalAmount} ₽\n` +
        `📦 Товаров: ${parsed.items.length}\n\n` +
        (addedItems.length > 0 ? `✅ Добавлено позиций: ${addedItems.length}\n${addedItems.join("\n")}\n\n` : "") +
        (notFoundItems.length > 0 ? `⚠️ Товары не найдены в БД:\n${notFoundItems.join(", ")}\n\nСоздайте эти товары в системе для автоматического распознавания.` : "");

      return {
        success: true,
        message: summary,
        data: {
          transactionId: transaction.id,
          addedItems: addedItems.length,
          notFoundItems: notFoundItems.length
        }
      };

    } catch (error) {
      logger.error("processReceipt error:", error);
      return {
        success: false,
        message: "Ошибка обработки чека: " + (error instanceof Error ? error.message : "Unknown error")
      };
    }
  },
};
