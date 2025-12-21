"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { formatMoney } from "./calculations";

export interface ContractTemplate {
  id: string;
  name: string;
  template_type: string;
  content: string;
  variables: string[];
  is_default: boolean;
  version: number;
}

export interface InvestorDocument {
  id: string;
  investment_id: string | null;
  template_id: string | null;
  document_type: string;
  document_number: string | null;
  title: string;
  content: string | null;
  file_path: string | null;
  status: "draft" | "pending_signature" | "signed" | "cancelled";
  signed_at: string | null;
  created_at: string;
}

export interface ReconciliationAct {
  id: string;
  investment_id: string;
  act_number: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  total_invested: number;
  total_returned: number;
  closing_balance: number;
  status: "draft" | "sent" | "confirmed" | "disputed";
  investor_confirmed_at: string | null;
  notes: string | null;
}

/**
 * Получение шаблонов документов
 */
export async function getContractTemplates(): Promise<ContractTemplate[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data } = await supabase
    .from("investor_contract_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  return (data || []).map(t => ({
    id: t.id,
    name: t.name,
    template_type: t.template_type,
    content: t.content,
    variables: t.variables || [],
    is_default: t.is_default,
    version: t.version,
  }));
}

/**
 * Сохранение шаблона документа
 */
export async function saveContractTemplate(
  template: Partial<ContractTemplate> & { name: string; template_type: string; content: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "Не авторизован" };
  }

  if (template.id) {
    const { error } = await supabase
      .from("investor_contract_templates")
      .update({
        name: template.name,
        template_type: template.template_type,
        content: template.content,
        variables: template.variables || [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", template.id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, id: template.id };
  }

  const { data, error } = await supabase
    .from("investor_contract_templates")
    .insert({
      user_id: user.id,
      name: template.name,
      template_type: template.template_type,
      content: template.content,
      variables: template.variables || [],
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * Получение документов по инвестиции
 */
export async function getInvestmentDocuments(investmentId: string): Promise<InvestorDocument[]> {
  const supabase = await createRSCClient();
  
  const { data } = await supabase
    .from("investor_documents")
    .select("*")
    .eq("investment_id", investmentId)
    .order("created_at", { ascending: false });

  return (data || []).map(d => ({
    id: d.id,
    investment_id: d.investment_id,
    template_id: d.template_id,
    document_type: d.document_type,
    document_number: d.document_number,
    title: d.title,
    content: d.content,
    file_path: d.file_path,
    status: d.status,
    signed_at: d.signed_at,
    created_at: d.created_at,
  }));
}

/**
 * Генерация документа из шаблона
 */
export async function generateDocument(
  templateId: string,
  investmentId: string,
  variables: Record<string, string>
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "Не авторизован" };
  }

  // Получаем шаблон
  const { data: template } = await supabase
    .from("investor_contract_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!template) {
    return { success: false, error: "Шаблон не найден" };
  }

  // Получаем инвестицию
  const { data: investment } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources!investments_source_id_fkey(id, name, contact_person)
    `)
    .eq("id", investmentId)
    .single();

  if (!investment) {
    return { success: false, error: "Инвестиция не найдена" };
  }

  // Заменяем переменные в шаблоне
  let content = template.content;
  const allVariables: Record<string, string> = {
    ...variables,
    investment_number: investment.investment_number,
    investor_name: investment.source?.name || "",
    investor_contact: investment.source?.contact_person || "",
    amount: formatMoney(investment.approved_amount),
    total_return: formatMoney(investment.total_return_amount),
    interest_rate: `${investment.interest_rate}%`,
    due_date: new Date(investment.due_date).toLocaleDateString("ru-RU"),
    current_date: new Date().toLocaleDateString("ru-RU"),
  };

  for (const [key, value] of Object.entries(allVariables)) {
    content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  // Генерируем номер документа
  const docNumber = `DOC-${Date.now().toString(36).toUpperCase()}`;

  // Создаём документ
  const { data: doc, error } = await supabase
    .from("investor_documents")
    .insert({
      user_id: user.id,
      investment_id: investmentId,
      template_id: templateId,
      document_type: template.template_type,
      document_number: docNumber,
      title: `${template.name} - ${investment.investment_number}`,
      content,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, documentId: doc.id };
}

/**
 * Получение актов сверки
 */
export async function getReconciliationActs(investmentId?: string): Promise<ReconciliationAct[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  let query = supabase
    .from("investor_reconciliation_acts")
    .select("*")
    .eq("user_id", user.id)
    .order("period_end", { ascending: false });

  if (investmentId) {
    query = query.eq("investment_id", investmentId);
  }

  const { data } = await query;

  return (data || []).map(a => ({
    id: a.id,
    investment_id: a.investment_id,
    act_number: a.act_number,
    period_start: a.period_start,
    period_end: a.period_end,
    opening_balance: a.opening_balance,
    total_invested: a.total_invested,
    total_returned: a.total_returned,
    closing_balance: a.closing_balance,
    status: a.status,
    investor_confirmed_at: a.investor_confirmed_at,
    notes: a.notes,
  }));
}

/**
 * Создание акта сверки
 */
export async function createReconciliationAct(
  investmentId: string,
  periodStart: string,
  periodEnd: string
): Promise<{ success: boolean; actId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "Не авторизован" };
  }

  // Получаем инвестицию
  const { data: investment } = await supabase
    .from("investments")
    .select("*")
    .eq("id", investmentId)
    .single();

  if (!investment) {
    return { success: false, error: "Инвестиция не найдена" };
  }

  // Рассчитываем балансы
  const openingBalance = investment.approved_amount;
  const totalInvested = investment.approved_amount;
  const totalReturned = (investment.returned_principal || 0) + (investment.returned_interest || 0);
  const closingBalance = totalInvested - totalReturned;

  // Генерируем номер акта
  const actNumber = `ACT-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

  const { data, error } = await supabase
    .from("investor_reconciliation_acts")
    .insert({
      user_id: user.id,
      investment_id: investmentId,
      act_number: actNumber,
      period_start: periodStart,
      period_end: periodEnd,
      opening_balance: openingBalance,
      total_invested: totalInvested,
      total_returned: totalReturned,
      closing_balance: closingBalance,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, actId: data.id };
}
