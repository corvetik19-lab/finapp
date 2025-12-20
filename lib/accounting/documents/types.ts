// Типы для расширенного документооборота

// ============================================
// Кассовые ордера (ПКО/РКО)
// ============================================

export type CashOrderType = 'pko' | 'rko';
export type CashOrderStatus = 'draft' | 'approved' | 'cancelled';

export interface CashOrder {
  id: string;
  company_id: string;
  order_type: CashOrderType;
  order_number: number;
  order_date: string;
  amount: number;
  counterparty_id?: string;
  counterparty_name?: string;
  basis?: string;
  appendix?: string;
  received_from?: string;
  issued_to?: string;
  bank_account_id?: string;
  tender_id?: string;
  document_id?: string;
  kudir_entry_id?: string;
  status: CashOrderStatus;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCashOrderInput {
  order_type: CashOrderType;
  order_date: string;
  amount: number;
  counterparty_id?: string;
  counterparty_name?: string;
  basis?: string;
  appendix?: string;
  received_from?: string;
  issued_to?: string;
  bank_account_id?: string;
  tender_id?: string;
  document_id?: string;
  notes?: string;
}

// ============================================
// Авансовые отчёты
// ============================================

export type AdvanceReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

export interface AdvanceReport {
  id: string;
  company_id: string;
  report_number: number;
  report_date: string;
  employee_id?: string;
  employee_name: string;
  employee_position?: string;
  department?: string;
  purpose?: string;
  advance_amount: number;
  spent_amount: number;
  balance_amount: number;
  overspent_amount: number;
  status: AdvanceReportStatus;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  tender_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  items?: AdvanceReportItem[];
}

export interface AdvanceReportItem {
  id: string;
  report_id: string;
  position: number;
  document_date: string;
  document_number?: string;
  document_name: string;
  amount: number;
  vat_amount: number;
  account_debit?: string;
  account_credit?: string;
  expense_category?: string;
  attachment_path?: string;
  notes?: string;
  created_at: string;
}

export interface CreateAdvanceReportInput {
  report_date: string;
  employee_id?: string;
  employee_name: string;
  employee_position?: string;
  department?: string;
  purpose?: string;
  advance_amount: number;
  tender_id?: string;
  notes?: string;
  items?: CreateAdvanceReportItemInput[];
}

export interface CreateAdvanceReportItemInput {
  document_date: string;
  document_number?: string;
  document_name: string;
  amount: number;
  vat_amount?: number;
  account_debit?: string;
  account_credit?: string;
  expense_category?: string;
  attachment_path?: string;
  notes?: string;
}

// ============================================
// Доверенности (М-2)
// ============================================

export type POAStatus = 'active' | 'used' | 'expired' | 'cancelled';

export interface PowerOfAttorney {
  id: string;
  company_id: string;
  poa_number: number;
  poa_date: string;
  valid_until: string;
  employee_id?: string;
  employee_name: string;
  employee_position?: string;
  passport_series?: string;
  passport_number?: string;
  passport_issued_by?: string;
  passport_issued_date?: string;
  counterparty_id?: string;
  counterparty_name: string;
  document_name?: string;
  document_number?: string;
  document_date?: string;
  status: POAStatus;
  used_at?: string;
  tender_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  items?: POAItem[];
}

export interface POAItem {
  id: string;
  poa_id: string;
  position: number;
  name: string;
  unit?: string;
  quantity?: number;
  created_at: string;
}

export interface CreatePOAInput {
  poa_date: string;
  valid_until: string;
  employee_id?: string;
  employee_name: string;
  employee_position?: string;
  passport_series?: string;
  passport_number?: string;
  passport_issued_by?: string;
  passport_issued_date?: string;
  counterparty_id?: string;
  counterparty_name: string;
  document_name?: string;
  document_number?: string;
  document_date?: string;
  tender_id?: string;
  notes?: string;
  items?: CreatePOAItemInput[];
}

export interface CreatePOAItemInput {
  name: string;
  unit?: string;
  quantity?: number;
}

// ============================================
// Акты сверки
// ============================================

export type ReconciliationStatus = 'draft' | 'sent' | 'confirmed' | 'disputed';

export interface ReconciliationAct {
  id: string;
  company_id: string;
  act_number: number;
  counterparty_id: string;
  counterparty?: {
    id: string;
    name: string;
    inn?: string;
  };
  period_start: string;
  period_end: string;
  opening_balance_debit: number;
  opening_balance_credit: number;
  our_debit: number;
  our_credit: number;
  their_debit: number;
  their_credit: number;
  closing_balance_debit: number;
  closing_balance_credit: number;
  discrepancy: number;
  status: ReconciliationStatus;
  our_signed_by?: string;
  our_signed_at?: string;
  their_signed_by?: string;
  their_signed_at?: string;
  dispute_comment?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  items?: ReconciliationItem[];
}

export interface ReconciliationItem {
  id: string;
  act_id: string;
  operation_date: string;
  document_type?: string;
  document_number?: string;
  document_date?: string;
  description?: string;
  our_debit: number;
  our_credit: number;
  their_debit: number;
  their_credit: number;
  document_id?: string;
  created_at: string;
}

export interface CreateReconciliationActInput {
  counterparty_id: string;
  period_start: string;
  period_end: string;
  opening_balance_debit?: number;
  opening_balance_credit?: number;
  notes?: string;
}

export interface ReconciliationActCalculated {
  our_debit: number;
  our_credit: number;
  their_debit: number;
  their_credit: number;
  closing_balance_debit: number;
  closing_balance_credit: number;
  discrepancy: number;
  items: ReconciliationItem[];
}

// ============================================
// Шаблоны документов
// ============================================

export interface DocumentTemplate {
  id: string;
  company_id: string;
  document_type: string;
  template_name: string;
  template_data: Record<string, unknown>;
  is_default: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentTemplateInput {
  document_type: string;
  template_name: string;
  template_data: Record<string, unknown>;
  is_default?: boolean;
}
