// Типы для работы с долгами

export type DebtType = "owe" | "owed"; // owe = вы должны, owed = вам должны
export type DebtStatus = "active" | "paid" | "partially_paid";

export type DebtRecord = {
  id: string;
  user_id: string;
  type: DebtType;
  creditor_debtor_name: string; // имя кредитора или должника
  amount: number; // в копейках
  currency: string;
  date_created: string;
  date_due: string | null;
  status: DebtStatus;
  amount_paid: number; // в копейках
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Debt = {
  id: string;
  type: DebtType;
  creditorDebtorName: string;
  amount: number; // в рублях
  currency: string;
  dateCreated: string;
  dateDue: string | null;
  status: DebtStatus;
  amountPaid: number; // в рублях
  remainingAmount: number; // в рублях (calculated)
  progressPercent: number; // calculated
  description: string | null;
};

export type DebtSummary = {
  totalOwed: number; // сколько вы должны
  totalOwedToYou: number; // сколько должны вам
  activeDebtsCount: number;
  overdueCount: number;
};

export type DebtFormData = {
  type: DebtType;
  creditorDebtorName: string;
  amount: string;
  currency: string;
  dateCreated: string;
  dateDue?: string;
  description?: string;
};
