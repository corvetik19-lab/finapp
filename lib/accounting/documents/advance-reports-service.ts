"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import {
  AdvanceReport,
  AdvanceReportStatus,
  CreateAdvanceReportInput,
  CreateAdvanceReportItemInput,
} from "./types";

export async function getAdvanceReports(filters?: {
  status?: AdvanceReportStatus;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  tenderId?: string;
}): Promise<AdvanceReport[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("accounting_advance_reports")
    .select("*")
    .eq("company_id", companyId)
    .order("report_date", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.startDate) {
    query = query.gte("report_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("report_date", filters.endDate);
  }
  if (filters?.employeeId) {
    query = query.eq("employee_id", filters.employeeId);
  }
  if (filters?.tenderId) {
    query = query.eq("tender_id", filters.tenderId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching advance reports:", error);
    return [];
  }

  return data || [];
}

export async function getAdvanceReport(id: string): Promise<AdvanceReport | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data: report, error } = await supabase
    .from("accounting_advance_reports")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (error || !report) {
    logger.error("Error fetching advance report:", error);
    return null;
  }

  // Получаем позиции
  const { data: items } = await supabase
    .from("accounting_advance_report_items")
    .select("*")
    .eq("report_id", id)
    .order("position", { ascending: true });

  return {
    ...report,
    items: items || [],
  };
}

export async function getNextAdvanceReportNumber(): Promise<number> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return 1;

  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;

  const { data } = await supabase
    .from("accounting_advance_reports")
    .select("report_number")
    .eq("company_id", companyId)
    .gte("report_date", startOfYear)
    .order("report_number", { ascending: false })
    .limit(1)
    .single();

  return (data?.report_number || 0) + 1;
}

export async function createAdvanceReport(
  input: CreateAdvanceReportInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();
  const reportNumber = await getNextAdvanceReportNumber();

  // Вычисляем потраченную сумму
  const spentAmount = (input.items || []).reduce((sum, item) => sum + item.amount, 0);

  const { data: report, error } = await supabase
    .from("accounting_advance_reports")
    .insert({
      company_id: companyId,
      report_number: reportNumber,
      report_date: input.report_date,
      employee_id: input.employee_id,
      employee_name: input.employee_name,
      employee_position: input.employee_position,
      department: input.department,
      purpose: input.purpose,
      advance_amount: input.advance_amount,
      spent_amount: spentAmount,
      tender_id: input.tender_id,
      notes: input.notes,
      status: "draft",
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (error || !report) {
    logger.error("Error creating advance report:", error);
    return { success: false, error: "Ошибка создания авансового отчёта" };
  }

  // Создаём позиции
  if (input.items && input.items.length > 0) {
    const items = input.items.map((item, index) => ({
      report_id: report.id,
      position: index + 1,
      document_date: item.document_date,
      document_number: item.document_number,
      document_name: item.document_name,
      amount: item.amount,
      vat_amount: item.vat_amount || 0,
      account_debit: item.account_debit,
      account_credit: item.account_credit,
      expense_category: item.expense_category,
      attachment_path: item.attachment_path,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from("accounting_advance_report_items")
      .insert(items);

    if (itemsError) {
      logger.error("Error creating advance report items:", itemsError);
    }
  }

  return { success: true, id: report.id };
}

export async function updateAdvanceReport(
  id: string,
  input: Partial<CreateAdvanceReportInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_advance_reports")
    .update({
      report_date: input.report_date,
      employee_id: input.employee_id,
      employee_name: input.employee_name,
      employee_position: input.employee_position,
      department: input.department,
      purpose: input.purpose,
      advance_amount: input.advance_amount,
      tender_id: input.tender_id,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating advance report:", error);
    return { success: false, error: "Ошибка обновления авансового отчёта" };
  }

  return { success: true };
}

export async function addAdvanceReportItem(
  reportId: string,
  item: CreateAdvanceReportItemInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем следующую позицию
  const { data: lastItem } = await supabase
    .from("accounting_advance_report_items")
    .select("position")
    .eq("report_id", reportId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (lastItem?.position || 0) + 1;

  const { data, error } = await supabase
    .from("accounting_advance_report_items")
    .insert({
      report_id: reportId,
      position,
      document_date: item.document_date,
      document_number: item.document_number,
      document_name: item.document_name,
      amount: item.amount,
      vat_amount: item.vat_amount || 0,
      account_debit: item.account_debit,
      account_credit: item.account_credit,
      expense_category: item.expense_category,
      attachment_path: item.attachment_path,
      notes: item.notes,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error adding advance report item:", error);
    return { success: false, error: "Ошибка добавления позиции" };
  }

  // Обновляем сумму расходов
  await recalculateSpentAmount(reportId);

  return { success: true, id: data.id };
}

export async function deleteAdvanceReportItem(
  reportId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();

  const { error } = await supabase
    .from("accounting_advance_report_items")
    .delete()
    .eq("id", itemId)
    .eq("report_id", reportId);

  if (error) {
    logger.error("Error deleting advance report item:", error);
    return { success: false, error: "Ошибка удаления позиции" };
  }

  // Обновляем сумму расходов
  await recalculateSpentAmount(reportId);

  return { success: true };
}

async function recalculateSpentAmount(reportId: string): Promise<void> {
  const supabase = await createRSCClient();

  const { data: items } = await supabase
    .from("accounting_advance_report_items")
    .select("amount")
    .eq("report_id", reportId);

  const spentAmount = (items || []).reduce((sum, item) => sum + (item.amount || 0), 0);

  await supabase
    .from("accounting_advance_reports")
    .update({ spent_amount: spentAmount })
    .eq("id", reportId);
}

export async function submitAdvanceReport(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_advance_reports")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) {
    logger.error("Error submitting advance report:", error);
    return { success: false, error: "Ошибка отправки авансового отчёта" };
  }

  return { success: true };
}

export async function approveAdvanceReport(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("accounting_advance_reports")
    .update({
      status: "approved",
      approved_by: user?.user?.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "submitted");

  if (error) {
    logger.error("Error approving advance report:", error);
    return { success: false, error: "Ошибка утверждения авансового отчёта" };
  }

  return { success: true };
}

export async function rejectAdvanceReport(
  id: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_advance_reports")
    .update({
      status: "rejected",
      rejection_reason: reason,
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "submitted");

  if (error) {
    logger.error("Error rejecting advance report:", error);
    return { success: false, error: "Ошибка отклонения авансового отчёта" };
  }

  return { success: true };
}

export async function deleteAdvanceReport(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Можно удалять только черновики
  const { error } = await supabase
    .from("accounting_advance_reports")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) {
    logger.error("Error deleting advance report:", error);
    return { success: false, error: "Ошибка удаления авансового отчёта" };
  }

  return { success: true };
}
