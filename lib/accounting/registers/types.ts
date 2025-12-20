// Типы для бухгалтерских регистров

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'off_balance';

export interface ChartOfAccounts {
  id: string;
  company_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  is_active: boolean;
  is_analytical: boolean;
  parent_account_id?: string;
  analytics_1?: string;
  analytics_2?: string;
  analytics_3?: string;
  description?: string;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_date: string;
  entry_number?: number;
  debit_account_id: string;
  debit_amount: number;
  credit_account_id: string;
  credit_amount: number;
  description?: string;
  document_type?: string;
  document_id?: string;
  counterparty_id?: string;
  tender_id?: string;
  is_auto: boolean;
  is_reversed: boolean;
  reversed_entry_id?: string;
  created_by?: string;
  created_at: string;
  
  // Связанные данные
  debit_account?: ChartOfAccounts;
  credit_account?: ChartOfAccounts;
}

export interface CreateJournalEntryInput {
  entry_date: string;
  debit_account_id: string;
  credit_account_id: string;
  amount: number;
  description?: string;
  document_type?: string;
  document_id?: string;
  counterparty_id?: string;
  tender_id?: string;
}

export interface AccountBalance {
  id: string;
  company_id: string;
  account_id: string;
  period_start: string;
  opening_debit: number;
  opening_credit: number;
  turnover_debit: number;
  turnover_credit: number;
  closing_debit: number;
  closing_credit: number;
  counterparty_id?: string;
  updated_at: string;
}

// ОСВ (Оборотно-сальдовая ведомость)
export interface OSVRow {
  account_code: string;
  account_name: string;
  opening_debit: number;
  opening_credit: number;
  turnover_debit: number;
  turnover_credit: number;
  closing_debit: number;
  closing_credit: number;
}

export interface OSVReport {
  period_start: string;
  period_end: string;
  rows: OSVRow[];
  totals: {
    opening_debit: number;
    opening_credit: number;
    turnover_debit: number;
    turnover_credit: number;
    closing_debit: number;
    closing_credit: number;
  };
}

// Карточка счёта
export interface AccountCardRow {
  entry_date: string;
  entry_number?: number;
  description?: string;
  correspondent_account: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
}

export interface AccountCard {
  account: ChartOfAccounts;
  period_start: string;
  period_end: string;
  opening_balance: number;
  rows: AccountCardRow[];
  closing_balance: number;
}

// Книга покупок
export interface PurchaseLedgerEntry {
  id: string;
  company_id: string;
  period_year: number;
  period_quarter: number;
  entry_number: number;
  counterparty_id?: string;
  counterparty_name: string;
  counterparty_inn?: string;
  counterparty_kpp?: string;
  document_type: string;
  document_number: string;
  document_date: string;
  total_amount: number;
  vat_amount: number;
  vat_rate: number;
  payment_date?: string;
  payment_document?: string;
  operation_code: string;
  is_included: boolean;
  notes?: string;
  created_at: string;
}

// Книга продаж
export interface SalesLedgerEntry {
  id: string;
  company_id: string;
  period_year: number;
  period_quarter: number;
  entry_number: number;
  counterparty_id?: string;
  counterparty_name: string;
  counterparty_inn?: string;
  counterparty_kpp?: string;
  invoice_number: string;
  invoice_date: string;
  correction_number?: string;
  correction_date?: string;
  total_amount: number;
  vat_amount: number;
  vat_rate: number;
  operation_code: string;
  is_included: boolean;
  notes?: string;
  created_at: string;
}

export interface CreatePurchaseLedgerInput {
  period_year: number;
  period_quarter: number;
  counterparty_id?: string;
  counterparty_name: string;
  counterparty_inn?: string;
  counterparty_kpp?: string;
  document_type: string;
  document_number: string;
  document_date: string;
  total_amount: number;
  vat_amount: number;
  vat_rate?: number;
  payment_date?: string;
  payment_document?: string;
  operation_code?: string;
  notes?: string;
}

export interface CreateSalesLedgerInput {
  period_year: number;
  period_quarter: number;
  counterparty_id?: string;
  counterparty_name: string;
  counterparty_inn?: string;
  counterparty_kpp?: string;
  invoice_number: string;
  invoice_date: string;
  correction_number?: string;
  correction_date?: string;
  total_amount: number;
  vat_amount: number;
  vat_rate?: number;
  operation_code?: string;
  notes?: string;
}

// Лейблы
export const accountTypeLabels: Record<AccountType, string> = {
  asset: 'Актив',
  liability: 'Пассив',
  equity: 'Капитал',
  income: 'Доходы',
  expense: 'Расходы',
  off_balance: 'Забалансовый',
};

export const operationCodeLabels: Record<string, string> = {
  '01': 'Реализация товаров (работ, услуг)',
  '02': 'Частичная оплата (аванс)',
  '06': 'Операции налогового агента',
  '10': 'Безвозмездная передача',
  '13': 'Корректировка',
  '16': 'Возврат товаров',
  '17': 'Изменение стоимости',
  '18': 'Составление первичных документов',
  '21': 'Реализация налогового агента',
  '22': 'Возврат авансов',
  '26': 'Реализация нерезидентам',
};
