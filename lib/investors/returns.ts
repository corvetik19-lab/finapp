"use server";

import { createRSCClient } from "@/lib/supabase/server";
import type { Investment, InvestmentTransaction } from "./types";
import { getInvestmentById, createTransaction, updateScheduleItem, getSchedule } from "./service";

// ============================================
// Логика возвратов инвестиций
// ============================================

export interface ReturnPaymentInput {
  investment_id: string;
  principal_amount: number;
  interest_amount: number;
  transaction_date: string;
  document_number?: string;
  notes?: string;
}

export interface ReturnResult {
  investment: Investment;
  transactions: InvestmentTransaction[];
  remainingPrincipal: number;
  remainingInterest: number;
  isFullyPaid: boolean;
}

/**
 * Регистрация возврата инвестиции
 */
export async function registerReturn(input: ReturnPaymentInput): Promise<ReturnResult> {
  const investment = await getInvestmentById(input.investment_id);
  if (!investment) throw new Error("Инвестиция не найдена");

  const transactions: InvestmentTransaction[] = [];

  // Создаём транзакцию возврата основного долга
  if (input.principal_amount > 0) {
    const principalTx = await createTransaction({
      investment_id: input.investment_id,
      transaction_type: "return_principal",
      amount: input.principal_amount,
      transaction_date: input.transaction_date,
      document_number: input.document_number,
      notes: input.notes ? `Возврат основного долга: ${input.notes}` : "Возврат основного долга",
    });
    transactions.push(principalTx);
  }

  // Создаём транзакцию возврата процентов
  if (input.interest_amount > 0) {
    const interestTx = await createTransaction({
      investment_id: input.investment_id,
      transaction_type: "return_interest",
      amount: input.interest_amount,
      transaction_date: input.transaction_date,
      document_number: input.document_number,
      notes: input.notes ? `Возврат процентов: ${input.notes}` : "Возврат процентов",
    });
    transactions.push(interestTx);
  }

  // Получаем обновлённую инвестицию
  const updatedInvestment = await getInvestmentById(input.investment_id);
  if (!updatedInvestment) throw new Error("Ошибка обновления");

  const remainingPrincipal = updatedInvestment.approved_amount - updatedInvestment.returned_principal;
  const remainingInterest = updatedInvestment.interest_amount - updatedInvestment.returned_interest;
  const isFullyPaid = remainingPrincipal <= 0 && remainingInterest <= 0;

  // Обновляем статус инвестиции
  if (isFullyPaid) {
    await updateInvestmentStatus(input.investment_id, "completed");
  } else if (updatedInvestment.returned_principal > 0 || updatedInvestment.returned_interest > 0) {
    await updateInvestmentStatus(input.investment_id, "returning");
  }

  // Обновляем график платежей
  await updateScheduleAfterPayment(input.investment_id, input.principal_amount + input.interest_amount, input.transaction_date);

  return {
    investment: updatedInvestment,
    transactions,
    remainingPrincipal,
    remainingInterest,
    isFullyPaid,
  };
}

/**
 * Получение расчёта остатка по инвестиции
 */
export async function getInvestmentBalance(investmentId: string): Promise<{
  principal: number;
  interest: number;
  totalDue: number;
  paidPrincipal: number;
  paidInterest: number;
  remainingPrincipal: number;
  remainingInterest: number;
  remainingTotal: number;
  percentPaid: number;
}> {
  const investment = await getInvestmentById(investmentId);
  if (!investment) throw new Error("Инвестиция не найдена");

  const remainingPrincipal = investment.approved_amount - investment.returned_principal;
  const remainingInterest = investment.interest_amount - investment.returned_interest;
  const remainingTotal = remainingPrincipal + remainingInterest;
  const percentPaid = investment.total_return_amount > 0
    ? ((investment.returned_principal + investment.returned_interest) / investment.total_return_amount) * 100
    : 0;

  return {
    principal: investment.approved_amount,
    interest: investment.interest_amount,
    totalDue: investment.total_return_amount,
    paidPrincipal: investment.returned_principal,
    paidInterest: investment.returned_interest,
    remainingPrincipal,
    remainingInterest,
    remainingTotal,
    percentPaid: Math.round(percentPaid * 100) / 100,
  };
}

/**
 * Получение просроченных инвестиций
 */
export async function getOverdueInvestments(): Promise<Investment[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources(id, name, source_type)
    `)
    .eq("user_id", user.id)
    .lt("due_date", today)
    .not("status", "in", '("completed","cancelled")')
    .order("due_date");

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Получение инвестиций с ближайшими платежами
 */
export async function getUpcomingPayments(days: number = 30): Promise<Investment[]> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const today = new Date();
  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources(id, name, source_type)
    `)
    .eq("user_id", user.id)
    .gte("due_date", today.toISOString().split("T")[0])
    .lte("due_date", futureDate.toISOString().split("T")[0])
    .not("status", "in", '("completed","cancelled")')
    .order("due_date");

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Расчёт пени за просрочку
 */
export function calculatePenalty(
  amount: number,
  daysOverdue: number,
  penaltyRate: number = 0.1 // 0.1% в день по умолчанию
): number {
  if (daysOverdue <= 0) return 0;
  return Math.round(amount * (penaltyRate / 100) * daysOverdue);
}

/**
 * Проверка и обновление статусов просроченных инвестиций
 */
export async function updateOverdueStatuses(): Promise<number> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Не авторизован");

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("investments")
    .update({ status: "overdue" })
    .eq("user_id", user.id)
    .lt("due_date", today)
    .not("status", "in", '("completed","cancelled","overdue")')
    .select();

  if (error) throw new Error(error.message);
  return data?.length || 0;
}

// ============================================
// Внутренние функции
// ============================================

async function updateInvestmentStatus(investmentId: string, status: string): Promise<void> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("investments")
    .update({ status })
    .eq("id", investmentId)
    .eq("user_id", user.id);
}

async function updateScheduleAfterPayment(
  investmentId: string,
  paidAmount: number,
  paidDate: string
): Promise<void> {
  const schedule = await getSchedule(investmentId);
  let remainingPayment = paidAmount;

  for (const item of schedule) {
    if (remainingPayment <= 0) break;
    if (item.status === "paid") continue;

    const itemRemaining = item.total_amount - item.paid_amount;
    if (itemRemaining <= 0) continue;

    const paymentForItem = Math.min(remainingPayment, itemRemaining);
    const newPaidAmount = item.paid_amount + paymentForItem;
    const newStatus = newPaidAmount >= item.total_amount ? "paid" : "partial";

    await updateScheduleItem(item.id, {
      paid_amount: newPaidAmount,
      paid_date: paidDate,
      status: newStatus,
    });

    remainingPayment -= paymentForItem;
  }
}
