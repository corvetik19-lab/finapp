import { createRSCClient } from "@/lib/supabase/helpers";
import type { Debt, DebtRecord, DebtSummary } from "./types";

// Конвертация записи БД в Debt объект
export function mapDebtRecord(record: DebtRecord): Debt {
  const amount = record.amount / 100;
  const amountPaid = record.amount_paid / 100;
  const remainingAmount = amount - amountPaid;
  const progressPercent = amount > 0 ? (amountPaid / amount) * 100 : 0;

  return {
    id: record.id,
    type: record.type,
    creditorDebtorName: record.creditor_debtor_name,
    amount,
    currency: record.currency,
    dateCreated: record.date_created,
    dateDue: record.date_due,
    status: record.status,
    amountPaid,
    remainingAmount,
    progressPercent: Math.round(progressPercent * 10) / 10,
    description: record.description,
  };
}

// Загрузка всех долгов пользователя
export async function loadDebts(): Promise<Debt[]> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .is("deleted_at", null)
    .order("date_created", { ascending: false });

  if (error) {
    console.error("Failed to load debts:", error);
    return [];
  }

  return (data as DebtRecord[]).map(mapDebtRecord);
}

// Загрузка статистики по долгам
export async function loadDebtsSummary(): Promise<DebtSummary> {
  const debts = await loadDebts();
  const activeDebts = debts.filter((debt) => debt.status !== "paid");

  const totalOwed = activeDebts
    .filter((debt) => debt.type === "owe")
    .reduce((sum, debt) => sum + debt.remainingAmount, 0);

  const totalOwedToYou = activeDebts
    .filter((debt) => debt.type === "owed")
    .reduce((sum, debt) => sum + debt.remainingAmount, 0);

  // Подсчитываем просроченные долги
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueCount = activeDebts.filter((debt) => {
    if (!debt.dateDue) return false;
    const dueDate = new Date(debt.dateDue);
    return dueDate < today;
  }).length;

  return {
    totalOwed,
    totalOwedToYou,
    activeDebtsCount: activeDebts.length,
    overdueCount,
  };
}

// Загрузка конкретного долга
export async function loadDebt(id: string): Promise<Debt | null> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    console.error("Failed to load debt:", error);
    return null;
  }

  return mapDebtRecord(data as DebtRecord);
}
