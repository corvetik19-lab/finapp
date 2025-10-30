// Типы для работы с кредитами

export type LoanStatus = "active" | "paid" | "closed";
export type LoanPaymentType = "annuity" | "differentiated";

export type LoanRecord = {
  id: string;
  user_id: string;
  name: string;
  bank: string;
  principal_amount: number; // в копейках
  interest_rate: number;
  monthly_payment: number; // в копейках
  issue_date: string;
  end_date: string | null;
  term_months: number | null;
  currency: string;
  status: LoanStatus;
  payment_type: LoanPaymentType | null;
  contract_number: string | null;
  next_payment_date: string | null;
  principal_paid: number; // в копейках
  interest_paid: number; // в копейках
  last_payment_date: string | null; // дата последнего платежа
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type LoanPaymentRecord = {
  id: string;
  user_id: string;
  loan_id: string;
  payment_date: string;
  amount: number; // в копейках
  principal_amount: number; // в копейках
  interest_amount: number; // в копейках
  transaction_id: string | null;
  note: string | null;
  created_at: string;
};

export type Loan = {
  id: string;
  name: string;
  bank: string;
  principalAmount: number; // в рублях
  interestRate: number;
  monthlyPayment: number; // в рублях
  issueDate: string;
  endDate: string | null;
  termMonths: number | null;
  currency: string;
  status: LoanStatus;
  paymentType: LoanPaymentType | null;
  contractNumber: string | null;
  nextPaymentDate: string | null;
  principalPaid: number; // в рублях
  interestPaid: number; // в рублях
  lastPaymentDate: string | null; // дата последнего платежа
  remainingDebt: number; // в рублях (calculated)
  progressPercent: number; // calculated
  isPaidThisMonth: boolean; // оплачен ли в этом месяце (calculated)
};

export type LoanPayment = {
  id: string;
  loanId: string;
  paymentDate: string;
  amount: number; // в рублях
  principalAmount: number; // в рублях
  interestAmount: number; // в рублях
  transactionId: string | null;
  note: string | null;
};

export type LoanSummary = {
  totalDebt: number; // общий долг
  monthlyPayment: number; // ежемесячный платёж
  nextPayment: {
    amount: number;
    daysUntil: number;
  } | null;
  activeLoansCount: number;
};
