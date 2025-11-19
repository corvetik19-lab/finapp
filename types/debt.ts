export type DebtType = 'owe' | 'owed';
export type DebtStatus = 'active' | 'paid' | 'partially_paid';

export interface Debt {
  id: string;
  user_id: string;
  type: DebtType;
  creditor_debtor_name: string;
  amount: number; // in minor units (kopecks)
  currency: string;
  date_created: string;
  date_due: string | null;
  status: DebtStatus;
  amount_paid: number; // in minor units
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
