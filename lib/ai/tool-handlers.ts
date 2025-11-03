/**
 * Обработчики инструментов AI - выполняют действия в приложении
 */

import { createAdminClient, createRouteClient } from "@/lib/supabase/helpers";
import type { ToolParameters } from "./tools";
import { searchRelevantTransactions } from "./rag-pipeline";

type TransactionSummaryRow = {
  amount: number;
  direction: "income" | "expense";
};

type TransactionRecordRow = {
  occurred_at: string;
  amount: number;
  direction: "income" | "expense";
  currency?: string | null;
  note?: string | null;
  categories?: { name?: string | null } | null;
  accounts?: { name?: string | null } | null;
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

  const query = supabase
    .from("transactions")
    .select("amount, categories(name)")
    .eq("user_id", userId)
    .eq("direction", "expense");

  if (params.startDate) {
    query.gte("date", params.startDate);
  }
  if (params.endDate) {
    query.lte("date", params.endDate);
  }

  const { data: transactions } = await query;

  if (!transactions) {
    return { success: false, message: "Не удалось получить данные" };
  }

  // Группировка по категориям
  const byCategory: Record<string, number> = {};
  transactions.forEach((t: { amount: number; categories: { name: string }[] | { name: string } | null }) => {
    // Supabase может вернуть как объект, так и массив
    const categories = Array.isArray(t.categories) ? t.categories[0] : t.categories;
    const catName = categories?.name || "Без категории";
    byCategory[catName] = (byCategory[catName] || 0) + t.amount / 100;
  });

  const summary = Object.entries(byCategory)
    .map(([name, amount]) => `${name}: ${amount} ₽`)
    .join(", ");

  return {
    success: true,
    data: byCategory,
    message: `Расходы по категориям: ${summary}`,
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
  const supabase = createAdminClient();
  
  if (!params.userId) {
    throw new Error("userId is required for AI tool calls");
  }
  
  const userId = params.userId;
  const limit = params.limit || 10;

  let query = supabase
    .from("transactions")
    .select(`
      id,
      amount,
      direction,
      currency,
      occurred_at,
      note,
      categories(name),
      accounts(name)
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

  const { data, error } = await query;

  if (error) throw error;
  
  const records: TransactionRecordRow[] = (data ?? []) as TransactionRecordRow[];

  if (records.length === 0) {
    return { 
      success: true, 
      data: [], 
      message: "📭 Транзакций пока нет. Добавь первую трату или доход!" 
    };
  }

  // Форматируем для ответа
  const formatted = records.map((t) => ({
    date: new Date(t.occurred_at).toLocaleDateString('ru-RU'),
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
    console.error("Error in handleSearchTransactions:", error);
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
  
  // Заглушки для остальных функций (пока не реализованы)
  getCategories: async () => ({ success: true, message: "Функция в разработке" }),
  getAccounts: async () => ({ success: true, message: "Функция в разработке" }),
  getBudgets: async () => ({ success: true, message: "Функция в разработке" }),
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
};
