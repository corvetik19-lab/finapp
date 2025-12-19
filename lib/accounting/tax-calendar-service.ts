"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import type { TaxType, TaxPaymentStatus, TaxPayment, TaxCalendarEntry } from "./tax-calendar-types";
import { TAX_DEADLINES } from "./tax-calendar-types";
import { logger } from "@/lib/logger";

// Re-export types for consumers
export type { TaxType, TaxPaymentStatus, TaxPayment, TaxCalendarEntry };

// Получить календарь налогов на год
export async function getTaxCalendar(year: number): Promise<TaxCalendarEntry[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  // Получаем существующие записи
  const { data: payments } = await supabase
    .from("tax_payments")
    .select("*")
    .eq("company_id", companyId)
    .gte("due_date", `${year}-01-01`)
    .lte("due_date", `${year}-12-31`)
    .order("due_date", { ascending: true });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries: TaxCalendarEntry[] = (payments || []).map(p => {
    const dueDate = new Date(p.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntilDue < 0 && p.status !== "paid" && p.status !== "cancelled";

    return {
      id: p.id,
      taxType: p.tax_type as TaxType,
      taxName: p.tax_name,
      period: p.period,
      dueDate: p.due_date,
      amount: p.amount,
      status: isOverdue ? "overdue" : p.status,
      daysUntilDue,
      isOverdue,
      paidAmount: p.paid_amount || 0,
    };
  });

  return entries;
}

// Получить предстоящие платежи (для дашборда)
export async function getUpcomingTaxPayments(days: number = 30): Promise<TaxCalendarEntry[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  const { data: payments } = await supabase
    .from("tax_payments")
    .select("*")
    .eq("company_id", companyId)
    .gte("due_date", today.toISOString().split("T")[0])
    .lte("due_date", futureDate.toISOString().split("T")[0])
    .in("status", ["pending", "overdue"])
    .order("due_date", { ascending: true })
    .limit(10);

  return (payments || []).map(p => {
    const dueDate = new Date(p.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: p.id,
      taxType: p.tax_type as TaxType,
      taxName: p.tax_name,
      period: p.period,
      dueDate: p.due_date,
      amount: p.amount,
      status: p.status,
      daysUntilDue,
      isOverdue: daysUntilDue < 0,
      paidAmount: p.paid_amount || 0,
    };
  });
}

// Получить просроченные платежи
export async function getOverdueTaxPayments(): Promise<TaxCalendarEntry[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const today = new Date().toISOString().split("T")[0];

  const { data: payments } = await supabase
    .from("tax_payments")
    .select("*")
    .eq("company_id", companyId)
    .lt("due_date", today)
    .eq("status", "pending")
    .order("due_date", { ascending: true });

  const todayDate = new Date();

  return (payments || []).map(p => {
    const dueDate = new Date(p.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: p.id,
      taxType: p.tax_type as TaxType,
      taxName: p.tax_name,
      period: p.period,
      dueDate: p.due_date,
      amount: p.amount,
      status: "overdue",
      daysUntilDue,
      isOverdue: true,
      paidAmount: p.paid_amount || 0,
    };
  });
}

// Создать налоговый платёж
export async function createTaxPayment(input: {
  taxType: TaxType;
  taxName?: string;
  period: string;
  dueDate: string;
  amount?: number;
  notes?: string;
}): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const taxName = input.taxName || TAX_DEADLINES[input.taxType]?.name || input.taxType;

  const { data, error } = await supabase
    .from("tax_payments")
    .insert({
      company_id: companyId,
      tax_type: input.taxType,
      tax_name: taxName,
      period: input.period,
      due_date: input.dueDate,
      amount: input.amount || null,
      status: "pending",
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating tax payment:", error);
    return { success: false, error: "Ошибка создания платежа" };
  }

  return { success: true, paymentId: data.id };
}

// Отметить платёж как оплаченный
export async function markTaxPaymentPaid(
  paymentId: string,
  paidAmount: number,
  paidDate?: string,
  documentId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tax_payments")
    .update({
      status: "paid",
      paid_amount: paidAmount,
      paid_date: paidDate || new Date().toISOString().split("T")[0],
      document_id: documentId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error marking tax payment as paid:", error);
    return { success: false, error: "Ошибка обновления платежа" };
  }

  return { success: true };
}

// Обновить сумму платежа
export async function updateTaxPaymentAmount(
  paymentId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tax_payments")
    .update({
      amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("company_id", companyId);

  if (error) {
    return { success: false, error: "Ошибка обновления суммы" };
  }

  return { success: true };
}

// Удалить платёж
export async function deleteTaxPayment(
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("tax_payments")
    .delete()
    .eq("id", paymentId)
    .eq("company_id", companyId);

  if (error) {
    return { success: false, error: "Ошибка удаления платежа" };
  }

  return { success: true };
}

// Генерация календаря на год (автозаполнение)
export async function generateTaxCalendarForYear(
  year: number,
  taxTypes: TaxType[]
): Promise<{ success: boolean; created: number; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, created: 0, error: "Компания не найдена" };
  }

  const payments: {
    company_id: string;
    tax_type: TaxType;
    tax_name: string;
    period: string;
    due_date: string;
    status: string;
  }[] = [];

  for (const taxType of taxTypes) {
    const taxInfo = TAX_DEADLINES[taxType];
    if (!taxInfo || taxInfo.deadlines.length === 0) continue;

    for (const deadline of taxInfo.deadlines) {
      const [month, day] = deadline.split("-");
      const dueDate = `${year}-${month}-${day}`;

      // Определяем период
      let period: string;
      const monthNum = parseInt(month);
      if (taxType === "usn") {
        period = `${year - 1}`; // Годовой за прошлый год
      } else if (taxType === "usn_advance") {
        const quarter = Math.ceil(monthNum / 3);
        period = `${year}-Q${quarter === 1 ? 4 : quarter - 1}`;
        if (quarter === 1) period = `${year - 1}-Q4`;
      } else {
        period = `${year}-${month}`;
      }

      payments.push({
        company_id: companyId,
        tax_type: taxType,
        tax_name: taxInfo.name,
        period,
        due_date: dueDate,
        status: "pending",
      });
    }
  }

  if (payments.length === 0) {
    return { success: true, created: 0 };
  }

  const { error } = await supabase.from("tax_payments").insert(payments);

  if (error) {
    logger.error("Error generating tax calendar:", error);
    return { success: false, created: 0, error: "Ошибка генерации календаря" };
  }

  return { success: true, created: payments.length };
}

// Получить статистику по налогам за год
export async function getTaxStatistics(year: number): Promise<{
  totalDue: number;
  totalPaid: number;
  pendingCount: number;
  overdueCount: number;
  paidCount: number;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { totalDue: 0, totalPaid: 0, pendingCount: 0, overdueCount: 0, paidCount: 0 };
  }

  const { data: payments } = await supabase
    .from("tax_payments")
    .select("amount, paid_amount, status, due_date")
    .eq("company_id", companyId)
    .gte("due_date", `${year}-01-01`)
    .lte("due_date", `${year}-12-31`);

  const today = new Date().toISOString().split("T")[0];

  let totalDue = 0;
  let totalPaid = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let paidCount = 0;

  for (const p of payments || []) {
    totalDue += p.amount || 0;
    totalPaid += p.paid_amount || 0;

    if (p.status === "paid") {
      paidCount++;
    } else if (p.due_date < today) {
      overdueCount++;
    } else {
      pendingCount++;
    }
  }

  return { totalDue, totalPaid, pendingCount, overdueCount, paidCount };
}

// Constants are exported from ./tax-calendar-types.ts
