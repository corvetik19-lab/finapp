"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import {
  PaymentCalendarItem,
  PaymentCalendarStatus,
  CreatePaymentCalendarInput,
  PaymentCalendarSummary,
} from "./types";

export async function getPaymentCalendar(filters?: {
  startDate?: string;
  endDate?: string;
  status?: PaymentCalendarStatus;
  type?: 'income' | 'expense';
  counterpartyId?: string;
  tenderId?: string;
}): Promise<PaymentCalendarItem[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("accounting_payment_calendar")
    .select("*")
    .eq("company_id", companyId)
    .order("planned_date", { ascending: true });

  if (filters?.startDate) {
    query = query.gte("planned_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("planned_date", filters.endDate);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.type) {
    query = query.eq("payment_type", filters.type);
  }
  if (filters?.counterpartyId) {
    query = query.eq("counterparty_id", filters.counterpartyId);
  }
  if (filters?.tenderId) {
    query = query.eq("tender_id", filters.tenderId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching payment calendar:", error);
    return [];
  }

  return data || [];
}

export async function getPaymentCalendarItem(id: string): Promise<PaymentCalendarItem | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("accounting_payment_calendar")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (error) {
    logger.error("Error fetching payment calendar item:", error);
    return null;
  }

  return data;
}

export async function createPaymentCalendarItem(
  input: CreatePaymentCalendarInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("accounting_payment_calendar")
    .insert({
      company_id: companyId,
      payment_type: input.payment_type,
      category: input.category,
      name: input.name,
      description: input.description,
      amount: input.amount,
      currency: input.currency || "RUB",
      planned_date: input.planned_date,
      is_recurring: input.is_recurring || false,
      recurrence_pattern: input.recurrence_pattern,
      recurrence_end_date: input.recurrence_end_date,
      counterparty_id: input.counterparty_id,
      counterparty_name: input.counterparty_name,
      document_id: input.document_id,
      tender_id: input.tender_id,
      bank_account_id: input.bank_account_id,
      priority: input.priority || "normal",
      notes: input.notes,
      status: "planned",
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating payment calendar item:", error);
    return { success: false, error: "Ошибка создания платежа" };
  }

  return { success: true, id: data.id };
}

export async function updatePaymentCalendarItem(
  id: string,
  input: Partial<CreatePaymentCalendarInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_payment_calendar")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating payment calendar item:", error);
    return { success: false, error: "Ошибка обновления платежа" };
  }

  return { success: true };
}

export async function updatePaymentStatus(
  id: string,
  status: PaymentCalendarStatus,
  actualDate?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (actualDate) {
    updateData.actual_date = actualDate;
  } else if (status === "paid") {
    updateData.actual_date = new Date().toISOString().split("T")[0];
  }

  const { error } = await supabase
    .from("accounting_payment_calendar")
    .update(updateData)
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating payment status:", error);
    return { success: false, error: "Ошибка обновления статуса" };
  }

  return { success: true };
}

export async function deletePaymentCalendarItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_payment_calendar")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error deleting payment calendar item:", error);
    return { success: false, error: "Ошибка удаления платежа" };
  }

  return { success: true };
}

export async function getPaymentCalendarSummary(): Promise<PaymentCalendarSummary> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  const emptySummary: PaymentCalendarSummary = {
    today: { income: 0, expense: 0, balance: 0 },
    thisWeek: { income: 0, expense: 0, balance: 0 },
    thisMonth: { income: 0, expense: 0, balance: 0 },
    overdue: { count: 0, amount: 0 },
    upcoming: { count: 0, amount: 0 },
  };

  if (!companyId) return emptySummary;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Получаем все платежи за месяц
  const { data: payments } = await supabase
    .from("accounting_payment_calendar")
    .select("*")
    .eq("company_id", companyId)
    .gte("planned_date", monthStart.toISOString().split("T")[0])
    .lte("planned_date", monthEnd.toISOString().split("T")[0]);

  if (!payments) return emptySummary;

  // Сегодня
  const todayPayments = payments.filter(p => p.planned_date === todayStr);
  const todayIncome = todayPayments.filter(p => p.payment_type === "income").reduce((sum, p) => sum + p.amount, 0);
  const todayExpense = todayPayments.filter(p => p.payment_type === "expense").reduce((sum, p) => sum + p.amount, 0);

  // Неделя
  const weekPayments = payments.filter(p => {
    const d = new Date(p.planned_date);
    return d >= weekStart && d <= weekEnd;
  });
  const weekIncome = weekPayments.filter(p => p.payment_type === "income").reduce((sum, p) => sum + p.amount, 0);
  const weekExpense = weekPayments.filter(p => p.payment_type === "expense").reduce((sum, p) => sum + p.amount, 0);

  // Месяц
  const monthIncome = payments.filter(p => p.payment_type === "income").reduce((sum, p) => sum + p.amount, 0);
  const monthExpense = payments.filter(p => p.payment_type === "expense").reduce((sum, p) => sum + p.amount, 0);

  // Просроченные
  const overduePayments = payments.filter(p => 
    p.status === "overdue" || (p.status === "planned" && p.planned_date < todayStr)
  );

  // Предстоящие (на 7 дней)
  const weekFromNow = new Date(today);
  weekFromNow.setDate(today.getDate() + 7);
  const upcomingPayments = payments.filter(p => 
    p.status === "planned" && 
    p.planned_date >= todayStr && 
    p.planned_date <= weekFromNow.toISOString().split("T")[0]
  );

  return {
    today: {
      income: todayIncome,
      expense: todayExpense,
      balance: todayIncome - todayExpense,
    },
    thisWeek: {
      income: weekIncome,
      expense: weekExpense,
      balance: weekIncome - weekExpense,
    },
    thisMonth: {
      income: monthIncome,
      expense: monthExpense,
      balance: monthIncome - monthExpense,
    },
    overdue: {
      count: overduePayments.length,
      amount: overduePayments.reduce((sum, p) => sum + p.amount, 0),
    },
    upcoming: {
      count: upcomingPayments.length,
      amount: upcomingPayments.reduce((sum, p) => sum + p.amount, 0),
    },
  };
}

export async function markOverduePayments(): Promise<number> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return 0;

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("accounting_payment_calendar")
    .update({ status: "overdue" })
    .eq("company_id", companyId)
    .in("status", ["planned", "confirmed"])
    .lt("planned_date", today)
    .select();

  if (error) {
    logger.error("Error marking overdue payments:", error);
    return 0;
  }

  return data?.length || 0;
}

export async function getUpcomingPayments(days: number = 7): Promise<PaymentCalendarItem[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);

  const { data, error } = await supabase
    .from("accounting_payment_calendar")
    .select("*")
    .eq("company_id", companyId)
    .in("status", ["planned", "confirmed"])
    .gte("planned_date", today.toISOString().split("T")[0])
    .lte("planned_date", futureDate.toISOString().split("T")[0])
    .order("planned_date", { ascending: true });

  if (error) {
    logger.error("Error fetching upcoming payments:", error);
    return [];
  }

  return data || [];
}

export async function getOverduePayments(): Promise<PaymentCalendarItem[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("accounting_payment_calendar")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "overdue")
    .order("planned_date", { ascending: true });

  if (error) {
    logger.error("Error fetching overdue payments:", error);
    return [];
  }

  return data || [];
}
