/**
 * Обработчики инструментов AI - выполняют действия в приложении
 */

import { createRouteClient } from "@/lib/supabase/helpers";
import type { ToolParameters } from "./tools";

// Получить ID пользователя
async function getCurrentUserId() {
  const supabase = await createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  return user.id;
}

// === ДЕБЕТОВЫЕ КАРТЫ ===
export async function handleAddDebitCard(params: ToolParameters<"addDebitCard">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: params.name,
      type: "debit_card",
      balance: Math.round(params.balance * 100), // в копейках
      currency: params.currency,
      bank: params.bank,
      card_number: params.cardNumber || null,
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `Карта "${params.name}" успешно добавлена с балансом ${params.balance} ${params.currency}` };
}

// === КРЕДИТНЫЕ КАРТЫ ===
export async function handleAddCreditCard(params: ToolParameters<"addCreditCard">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: params.name,
      type: "credit_card",
      balance: Math.round(params.balance * 100),
      currency: params.currency,
      bank: params.bank,
      card_number: params.cardNumber || null,
      credit_limit: Math.round(params.creditLimit * 100),
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `Кредитная карта "${params.name}" добавлена. Лимит: ${params.creditLimit} ${params.currency}` };
}

// === ТРАНЗАКЦИИ ===
export async function handleAddTransaction(params: ToolParameters<"addTransaction">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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
export async function handleAddBudget(params: ToolParameters<"addBudget">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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
export async function handleAddPlan(params: ToolParameters<"addPlan">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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
export async function handleAddBookmark(params: ToolParameters<"addBookmark">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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
export async function handleAddPrompt(params: ToolParameters<"addPrompt">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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
export async function handleGetFinancialSummary(params: ToolParameters<"getFinancialSummary">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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

  const income = transactions
    .filter(t => t.direction === "income")
    .reduce((sum, t) => sum + t.amount, 0) / 100;

  const expense = transactions
    .filter(t => t.direction === "expense")
    .reduce((sum, t) => sum + t.amount, 0) / 100;

  const balance = income - expense;

  return {
    success: true,
    data: { income, expense, balance, period: params.period },
    message: `За ${params.period === "week" ? "неделю" : params.period === "month" ? "месяц" : "год"}: доходы ${income} ₽, расходы ${expense} ₽, баланс ${balance} ₽`,
  };
}

// === РАСХОДЫ ПО КАТЕГОРИЯМ ===
export async function handleGetExpensesByCategory(params: ToolParameters<"getExpensesByCategory">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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
export async function handleGetAccountBalance(params: ToolParameters<"getAccountBalance">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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

// === ДОБАВИТЬ КАТЕГОРИЮ ===
export async function handleAddCategory(params: ToolParameters<"addCategory">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: params.name,
      type: params.type,
      icon: params.icon || null,
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, data, message: `Категория "${params.name}" создана` };
}

// === УПРАВЛЕНИЕ ПЛАНАМИ (расширенное) ===
export async function handleGetPlans(params: ToolParameters<"getPlans">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

  let query = supabase
    .from("plans")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: plans } = await query;

  if (!plans || plans.length === 0) {
    return { success: true, data: [], message: "У вас пока нет планов" };
  }

  const summary = plans.map(p => 
    `${p.name}: ${(p.current_amount || 0) / 100} / ${(p.target_amount || 0) / 100} ₽ (${Math.round(((p.current_amount || 0) / (p.target_amount || 1)) * 100)}%)`
  ).join(", ");

  return {
    success: true,
    data: plans,
    message: `Ваши планы: ${summary}`,
  };
}

export async function handleUpdatePlan(params: ToolParameters<"updatePlan">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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

export async function handleDeletePlan(params: ToolParameters<"deletePlan">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("plans")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.planId)
    .eq("user_id", userId);

  if (error) throw error;
  return { success: true, message: "План удалён" };
}

export async function handleAddPlanTopup(params: ToolParameters<"addPlanTopup">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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
export async function handleGetFitnessPrograms(params: ToolParameters<"getFitnessPrograms">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

  let query = supabase
    .from("fitness_programs")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.active === true) {
    query = query.eq("is_active", true);
  }

  const { data: programs } = await query;

  if (!programs || programs.length === 0) {
    return { success: true, data: [], message: "У вас пока нет фитнес-программ" };
  }

  const summary = programs.map(p => 
    `${p.name}${p.is_active ? ' (активна)' : ''}: ${p.duration || 'без срока'} дней`
  ).join(", ");

  return {
    success: true,
    data: programs,
    message: `Ваши программы: ${summary}`,
  };
}

export async function handleAddFitnessProgram(params: ToolParameters<"addFitnessProgram">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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

export async function handleUpdateFitnessProgram(params: ToolParameters<"updateFitnessProgram">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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

export async function handleDeleteFitnessProgram(params: ToolParameters<"deleteFitnessProgram">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("fitness_programs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.programId)
    .eq("user_id", userId);

  if (error) throw error;
  return { success: true, message: "Программа удалена" };
}

export async function handleAddFitnessWorkout(params: ToolParameters<"addFitnessWorkout">) {
  const supabase = await createRouteClient();
  const userId = await getCurrentUserId();

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

// Маппинг обработчиков
export const toolHandlers = {
  addDebitCard: handleAddDebitCard,
  addCreditCard: handleAddCreditCard,
  addTransaction: handleAddTransaction,
  addBudget: handleAddBudget,
  addPlan: handleAddPlan,
  addBookmark: handleAddBookmark,
  addPrompt: handleAddPrompt,
  getFinancialSummary: handleGetFinancialSummary,
  getExpensesByCategory: handleGetExpensesByCategory,
  getAccountBalance: handleGetAccountBalance,
  addCategory: handleAddCategory,
  // Управление планами
  getPlans: handleGetPlans,
  updatePlan: handleUpdatePlan,
  deletePlan: handleDeletePlan,
  addPlanTopup: handleAddPlanTopup,
  // Фитнес программы
  getFitnessPrograms: handleGetFitnessPrograms,
  addFitnessProgram: handleAddFitnessProgram,
  updateFitnessProgram: handleUpdateFitnessProgram,
  deleteFitnessProgram: handleDeleteFitnessProgram,
  addFitnessWorkout: handleAddFitnessWorkout,
};
