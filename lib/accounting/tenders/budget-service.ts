"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import {
  TenderBudget,
  CreateTenderBudgetInput,
  CreateBudgetItemInput,
} from "./types";

export async function getTenderBudget(tenderId: string): Promise<TenderBudget | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data: budget, error } = await supabase
    .from("tender_budgets")
    .select("*")
    .eq("company_id", companyId)
    .eq("tender_id", tenderId)
    .single();

  if (error || !budget) {
    return null;
  }

  // Получаем статьи бюджета
  const { data: items } = await supabase
    .from("tender_budget_items")
    .select("*")
    .eq("budget_id", budget.id)
    .order("position", { ascending: true });

  return {
    ...budget,
    items: items || [],
  };
}

export async function createTenderBudget(
  input: CreateTenderBudgetInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("tender_budgets")
    .insert({
      company_id: companyId,
      tender_id: input.tender_id,
      planned_revenue: input.planned_revenue,
      planned_materials: input.planned_materials || 0,
      planned_labor: input.planned_labor || 0,
      planned_subcontractors: input.planned_subcontractors || 0,
      planned_transport: input.planned_transport || 0,
      planned_overhead: input.planned_overhead || 0,
      planned_other: input.planned_other || 0,
      notes: input.notes,
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating tender budget:", error);
    return { success: false, error: "Ошибка создания бюджета" };
  }

  return { success: true, id: data.id };
}

export async function updateTenderBudget(
  budgetId: string,
  input: Partial<CreateTenderBudgetInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_budgets")
    .update({
      planned_revenue: input.planned_revenue,
      planned_materials: input.planned_materials,
      planned_labor: input.planned_labor,
      planned_subcontractors: input.planned_subcontractors,
      planned_transport: input.planned_transport,
      planned_overhead: input.planned_overhead,
      planned_other: input.planned_other,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", budgetId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating tender budget:", error);
    return { success: false, error: "Ошибка обновления бюджета" };
  }

  return { success: true };
}

export async function addBudgetItem(
  budgetId: string,
  input: CreateBudgetItemInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();

  // Получаем следующую позицию
  const { data: lastItem } = await supabase
    .from("tender_budget_items")
    .select("position")
    .eq("budget_id", budgetId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (lastItem?.position || 0) + 1;

  const { data, error } = await supabase
    .from("tender_budget_items")
    .insert({
      budget_id: budgetId,
      category: input.category,
      name: input.name,
      description: input.description,
      planned_amount: input.planned_amount,
      unit: input.unit,
      quantity: input.quantity,
      price_per_unit: input.price_per_unit,
      position,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error adding budget item:", error);
    return { success: false, error: "Ошибка добавления статьи" };
  }

  // Обновляем итоги бюджета по категории
  await recalculateBudgetCategory(budgetId, input.category);

  return { success: true, id: data.id };
}

export async function updateBudgetItem(
  itemId: string,
  input: Partial<CreateBudgetItemInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();

  // Получаем текущий item для категории
  const { data: currentItem } = await supabase
    .from("tender_budget_items")
    .select("budget_id, category")
    .eq("id", itemId)
    .single();

  if (!currentItem) {
    return { success: false, error: "Статья не найдена" };
  }

  const { error } = await supabase
    .from("tender_budget_items")
    .update({
      name: input.name,
      description: input.description,
      planned_amount: input.planned_amount,
      unit: input.unit,
      quantity: input.quantity,
      price_per_unit: input.price_per_unit,
    })
    .eq("id", itemId);

  if (error) {
    logger.error("Error updating budget item:", error);
    return { success: false, error: "Ошибка обновления статьи" };
  }

  // Обновляем итоги бюджета
  await recalculateBudgetCategory(currentItem.budget_id, currentItem.category);

  return { success: true };
}

export async function deleteBudgetItem(
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();

  // Получаем item для категории
  const { data: item } = await supabase
    .from("tender_budget_items")
    .select("budget_id, category")
    .eq("id", itemId)
    .single();

  if (!item) {
    return { success: false, error: "Статья не найдена" };
  }

  const { error } = await supabase
    .from("tender_budget_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    logger.error("Error deleting budget item:", error);
    return { success: false, error: "Ошибка удаления статьи" };
  }

  // Обновляем итоги бюджета
  await recalculateBudgetCategory(item.budget_id, item.category);

  return { success: true };
}

async function recalculateBudgetCategory(budgetId: string, category: string): Promise<void> {
  const supabase = await createRSCClient();

  // Считаем сумму по категории
  const { data: items } = await supabase
    .from("tender_budget_items")
    .select("planned_amount")
    .eq("budget_id", budgetId)
    .eq("category", category);

  const total = (items || []).reduce((sum, item) => sum + (item.planned_amount || 0), 0);

  // Обновляем соответствующее поле в бюджете
  const fieldMap: Record<string, string> = {
    materials: "planned_materials",
    labor: "planned_labor",
    subcontractors: "planned_subcontractors",
    transport: "planned_transport",
    overhead: "planned_overhead",
    other: "planned_other",
  };

  const field = fieldMap[category];
  if (field) {
    await supabase
      .from("tender_budgets")
      .update({ [field]: total })
      .eq("id", budgetId);
  }
}

export async function updateActualExpense(
  tenderId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_budgets")
    .update({
      actual_expense: amount,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("tender_id", tenderId);

  if (error) {
    logger.error("Error updating actual expense:", error);
    return { success: false, error: "Ошибка обновления фактических расходов" };
  }

  return { success: true };
}

export async function updateActualRevenue(
  tenderId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_budgets")
    .update({
      actual_revenue: amount,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("tender_id", tenderId);

  if (error) {
    logger.error("Error updating actual revenue:", error);
    return { success: false, error: "Ошибка обновления фактических доходов" };
  }

  return { success: true };
}

// Автоматический расчёт фактических показателей из документов и КУДиР
export async function recalculateActuals(tenderId: string): Promise<void> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return;

  // Считаем фактические доходы из оплаченных документов
  const { data: incomeData } = await supabase
    .from("accounting_documents")
    .select("total")
    .eq("company_id", companyId)
    .eq("tender_id", tenderId)
    .eq("status", "paid")
    .in("document_type", ["invoice", "act", "upd"])
    .is("deleted_at", null);

  const actualRevenue = (incomeData || []).reduce((sum, d) => sum + (d.total || 0), 0);

  // Считаем фактические расходы из КУДиР
  const { data: expenseData } = await supabase
    .from("kudir_entries")
    .select("expense")
    .eq("company_id", companyId)
    .eq("tender_id", tenderId);

  const actualExpense = (expenseData || []).reduce((sum, e) => sum + (e.expense || 0), 0);

  // Обновляем бюджет
  await supabase
    .from("tender_budgets")
    .update({
      actual_revenue: actualRevenue,
      actual_expense: actualExpense,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("tender_id", tenderId);
}

export async function deleteTenderBudget(
  budgetId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tender_budgets")
    .delete()
    .eq("id", budgetId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error deleting tender budget:", error);
    return { success: false, error: "Ошибка удаления бюджета" };
  }

  return { success: true };
}
