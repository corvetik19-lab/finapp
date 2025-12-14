"use server";

import { createRSCClient } from "@/lib/supabase/server";
import type {
  InvestmentSource,
  CreateSourceInput,
  UpdateSourceInput,
  Investment,
  CreateInvestmentInput,
  UpdateInvestmentInput,
  InvestmentTransaction,
  CreateTransactionInput,
  ReturnScheduleItem,
  CreateScheduleItemInput,
  InvestorAccess,
  CreateAccessInput,
  UpdateAccessInput,
} from "./types";
import { calculateInterest, generateReturnSchedule } from "./calculations";

// ============================================
// Источники финансирования
// ============================================

export async function getSources(): Promise<InvestmentSource[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase
    .from("investment_sources")
    .select("*")
    .eq("user_id", user.id)
    .order("name");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getActiveSource(): Promise<InvestmentSource[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase
    .from("investment_sources")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getSourceById(id: string): Promise<InvestmentSource | null> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase
    .from("investment_sources")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return null;
  return data;
}

export async function createSource(input: CreateSourceInput): Promise<InvestmentSource> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase
    .from("investment_sources")
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateSource(id: string, input: UpdateSourceInput): Promise<InvestmentSource> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase
    .from("investment_sources")
    .update(input)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSource(id: string): Promise<void> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  // Проверяем, нет ли активных инвестиций
  const { data: investments } = await supabase
    .from("investments")
    .select("id")
    .eq("source_id", id)
    .eq("user_id", user.id)
    .not("status", "in", '("completed","cancelled")')
    .limit(1);

  if (investments && investments.length > 0) {
    throw new Error("Нельзя удалить источник с активными инвестициями");
  }

  const { error } = await supabase
    .from("investment_sources")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

// ============================================
// Инвестиции
// ============================================

export async function getInvestments(filters?: {
  status?: string;
  sourceId?: string;
  tenderId?: string;
}): Promise<Investment[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  let query = supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources(id, name, source_type),
      tender:tenders(id, subject, purchase_number)
    `)
    .eq("user_id", user.id);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.sourceId) {
    query = query.eq("source_id", filters.sourceId);
  }
  if (filters?.tenderId) {
    query = query.eq("tender_id", filters.tenderId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getInvestmentById(id: string): Promise<Investment | null> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources(*),
      tender:tenders(id, subject, purchase_number, status)
    `)
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return null;
  return data;
}

export async function createInvestment(input: CreateInvestmentInput): Promise<Investment> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  // Расчёт процентов
  const calculation = calculateInterest({
    principal: input.approved_amount,
    interestRate: input.interest_rate,
    interestType: input.interest_type || "annual",
    periodDays: input.period_days,
  });

  // Расчёт доли инвестиций
  let investmentShare: number | null = null;
  if (input.tender_total_cost && input.tender_total_cost > 0) {
    investmentShare = (input.approved_amount / input.tender_total_cost) * 100;
  }

  const { data, error } = await supabase
    .from("investments")
    .insert({
      user_id: user.id,
      source_id: input.source_id,
      tender_id: input.tender_id || null,
      investment_number: input.investment_number,
      investment_date: input.investment_date,
      requested_amount: input.requested_amount,
      approved_amount: input.approved_amount,
      interest_rate: input.interest_rate,
      interest_type: input.interest_type || "annual",
      period_days: input.period_days,
      due_date: input.due_date,
      interest_amount: calculation.interestAmount,
      total_return_amount: calculation.totalReturn,
      tender_total_cost: input.tender_total_cost || null,
      own_funds_amount: input.own_funds_amount || 0,
      investment_share: investmentShare,
      purpose: input.purpose || null,
      notes: input.notes || null,
      contract_url: input.contract_url || null,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Генерируем график возвратов (один платёж в конце срока по умолчанию)
  const scheduleItems = generateReturnSchedule({
    investmentId: data.id,
    principal: input.approved_amount,
    interest: calculation.interestAmount,
    dueDate: input.due_date,
    scheduleType: "single",
  });

  for (const item of scheduleItems) {
    await createScheduleItem({
      ...item,
      investment_id: data.id,
    });
  }

  return data;
}

export async function updateInvestment(id: string, input: UpdateInvestmentInput): Promise<Investment> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  // Если меняются финансовые параметры, пересчитываем проценты
  const updateData: Record<string, unknown> = { ...input };

  if (input.approved_amount || input.interest_rate || input.period_days || input.interest_type) {
    const current = await getInvestmentById(id);
    if (current) {
      const calculation = calculateInterest({
        principal: input.approved_amount || current.approved_amount,
        interestRate: input.interest_rate || current.interest_rate,
        interestType: input.interest_type || current.interest_type,
        periodDays: input.period_days || current.period_days,
      });
      updateData.interest_amount = calculation.interestAmount;
      updateData.total_return_amount = calculation.totalReturn;
    }
  }

  // Пересчёт доли
  if (input.tender_total_cost !== undefined || input.approved_amount !== undefined) {
    const current = await getInvestmentById(id);
    if (current) {
      const totalCost = input.tender_total_cost ?? current.tender_total_cost;
      const amount = input.approved_amount ?? current.approved_amount;
      if (totalCost && totalCost > 0) {
        updateData.investment_share = (amount / totalCost) * 100;
      }
    }
  }

  const { data, error } = await supabase
    .from("investments")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteInvestment(id: string): Promise<void> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const investment = await getInvestmentById(id);
  if (!investment) throw new Error("Инвестиция не найдена");

  if (!["draft", "cancelled"].includes(investment.status)) {
    throw new Error("Можно удалить только черновик или отменённую инвестицию");
  }

  const { error } = await supabase
    .from("investments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

// ============================================
// Транзакции
// ============================================

export async function getTransactions(investmentId: string): Promise<InvestmentTransaction[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase
    .from("investment_transactions")
    .select("*")
    .eq("investment_id", investmentId)
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createTransaction(input: CreateTransactionInput): Promise<InvestmentTransaction> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase
    .from("investment_transactions")
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Обновляем суммы в инвестиции
  await updateInvestmentTotals(input.investment_id);

  return data;
}

async function updateInvestmentTotals(investmentId: string): Promise<void> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Получаем все транзакции
  const { data: transactions } = await supabase
    .from("investment_transactions")
    .select("*")
    .eq("investment_id", investmentId)
    .eq("user_id", user.id);

  if (!transactions) return;

  let receivedAmount = 0;
  let returnedPrincipal = 0;
  let returnedInterest = 0;

  for (const t of transactions) {
    switch (t.transaction_type) {
      case "receipt":
        receivedAmount += t.amount;
        break;
      case "return_principal":
        returnedPrincipal += t.amount;
        break;
      case "return_interest":
        returnedInterest += t.amount;
        break;
    }
  }

  await supabase
    .from("investments")
    .update({
      received_amount: receivedAmount,
      returned_principal: returnedPrincipal,
      returned_interest: returnedInterest,
    })
    .eq("id", investmentId)
    .eq("user_id", user.id);
}

// ============================================
// График возвратов
// ============================================

export async function getSchedule(investmentId: string): Promise<ReturnScheduleItem[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase
    .from("investment_returns_schedule")
    .select("*")
    .eq("investment_id", investmentId)
    .eq("user_id", user.id)
    .order("payment_number");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createScheduleItem(input: CreateScheduleItemInput): Promise<ReturnScheduleItem> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase
    .from("investment_returns_schedule")
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateScheduleItem(
  id: string,
  input: { paid_amount?: number; paid_date?: string; status?: string }
): Promise<ReturnScheduleItem> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase
    .from("investment_returns_schedule")
    .update(input)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ============================================
// Доступ инвесторов
// ============================================

export async function getInvestorAccess(sourceId?: string): Promise<InvestorAccess[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  let query = supabase
    .from("investor_access")
    .select(`
      *,
      source:investment_sources(id, name, source_type)
    `)
    .eq("user_id", user.id);

  if (sourceId) {
    query = query.eq("source_id", sourceId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createInvestorAccess(input: CreateAccessInput): Promise<InvestorAccess> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  // Генерируем токен приглашения
  const inviteToken = crypto.randomUUID();

  const { data, error } = await supabase
    .from("investor_access")
    .insert({
      user_id: user.id,
      source_id: input.source_id,
      investor_email: input.investor_email,
      can_view_tender_details: input.can_view_tender_details ?? true,
      can_view_documents: input.can_view_documents ?? false,
      can_view_financials: input.can_view_financials ?? true,
      can_download_reports: input.can_download_reports ?? true,
      invite_token: inviteToken,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateInvestorAccess(id: string, input: UpdateAccessInput): Promise<InvestorAccess> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { data, error } = await supabase
    .from("investor_access")
    .update(input)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteInvestorAccess(id: string): Promise<void> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const { error } = await supabase
    .from("investor_access")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

// ============================================
// Генерация номера инвестиции
// ============================================

export async function generateInvestmentNumber(): Promise<string> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const year = new Date().getFullYear();
  
  const { count } = await supabase
    .from("investments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", `${year}-01-01`);

  const number = (count || 0) + 1;
  return `ИНВ-${year}-${number.toString().padStart(4, "0")}`;
}
