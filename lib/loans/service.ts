import { createRSCClient } from "@/lib/supabase/helpers";
import type { Loan, LoanRecord, LoanSummary } from "./types";

// Конвертация записи БД в Loan объект
export function mapLoanRecord(record: LoanRecord): Loan {
  const principalAmount = record.principal_amount / 100;
  const principalPaid = record.principal_paid / 100;
  const remainingDebt = principalAmount - principalPaid;
  const progressPercent = principalAmount > 0 ? (principalPaid / principalAmount) * 100 : 0;

  return {
    id: record.id,
    name: record.name,
    bank: record.bank,
    principalAmount,
    interestRate: record.interest_rate,
    monthlyPayment: record.monthly_payment / 100,
    issueDate: record.issue_date,
    endDate: record.end_date,
    termMonths: record.term_months,
    currency: record.currency,
    status: record.status,
    paymentType: record.payment_type,
    contractNumber: record.contract_number,
    nextPaymentDate: record.next_payment_date,
    principalPaid,
    interestPaid: record.interest_paid / 100,
    remainingDebt,
    progressPercent: Math.round(progressPercent * 10) / 10,
  };
}

// Загрузка всех кредитов пользователя
export async function loadLoans(): Promise<Loan[]> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load loans:", error);
    return [];
  }

  return (data as LoanRecord[]).map(mapLoanRecord);
}

// Загрузка статистики по кредитам
export async function loadLoansSummary(): Promise<LoanSummary> {
  const loans = await loadLoans();
  const activeLoans = loans.filter((loan) => loan.status === "active");

  const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.remainingDebt, 0);
  const monthlyPayment = activeLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);

  // Найти ближайший платёж
  let nextPayment: LoanSummary["nextPayment"] = null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const loan of activeLoans) {
    if (!loan.nextPaymentDate) continue;
    
    const paymentDate = new Date(loan.nextPaymentDate);
    const daysUntil = Math.ceil((paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil >= 0 && (!nextPayment || daysUntil < nextPayment.daysUntil)) {
      nextPayment = {
        amount: loan.monthlyPayment,
        daysUntil,
      };
    }
  }

  return {
    totalDebt,
    monthlyPayment,
    nextPayment,
    activeLoansCount: activeLoans.length,
  };
}
