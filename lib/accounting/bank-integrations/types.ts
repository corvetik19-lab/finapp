// Типы для банковских интеграций

export type BankCode = 'sber' | 'alfa' | 'vtb' | 'tochka' | 'raiffeisen' | 'tinkoff' | 'otkritie' | 'other';
export type ConnectionStatus = 'pending' | 'active' | 'expired' | 'error' | 'disabled';
export type StatementStatus = 'new' | 'processing' | 'processed' | 'error';
export type TransactionType = 'debit' | 'credit';
export type ProcessingStatus = 'new' | 'matched' | 'created' | 'ignored' | 'error';
export type SyncType = 'full' | 'incremental' | 'manual';
export type SyncStatus = 'running' | 'success' | 'partial' | 'error';
export type RuleType = 'counterparty' | 'purpose' | 'amount' | 'combined';
export type ActionType = 'categorize' | 'link_counterparty' | 'create_document' | 'ignore';

// Банковское подключение
export interface BankConnection {
  id: string;
  company_id: string;
  bank_code: BankCode;
  bank_name: string;
  credentials?: Record<string, unknown>;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  status: ConnectionStatus;
  last_sync_at?: string;
  last_error?: string;
  settings: Record<string, unknown>;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  created_at: string;
  updated_at: string;
}

// Банковская выписка
export interface BankStatement {
  id: string;
  company_id: string;
  bank_account_id: string;
  statement_date: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  closing_balance: number;
  total_debit: number;
  total_credit: number;
  transaction_count: number;
  status: StatementStatus;
  source: 'api' | 'import' | 'manual';
  file_path?: string;
  file_format?: string;
  processed_at?: string;
  error_message?: string;
  created_at: string;
}

// Банковская транзакция
export interface BankTransaction {
  id: string;
  company_id: string;
  bank_account_id: string;
  statement_id?: string;
  external_id?: string;
  transaction_date: string;
  transaction_time?: string;
  value_date?: string;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  counterparty_name?: string;
  counterparty_inn?: string;
  counterparty_kpp?: string;
  counterparty_account?: string;
  counterparty_bank_bik?: string;
  counterparty_bank_name?: string;
  purpose?: string;
  document_number?: string;
  document_date?: string;
  processing_status: ProcessingStatus;
  linked_document_type?: string;
  linked_document_id?: string;
  matched_counterparty_id?: string;
  category_suggestion?: string;
  category_confidence?: number;
  notes?: string;
  created_at: string;
  processed_at?: string;
}

// Правило обработки
export interface BankProcessingRule {
  id: string;
  company_id: string;
  name: string;
  rule_type: RuleType;
  conditions: Record<string, unknown>;
  action_type: ActionType;
  action_params: Record<string, unknown>;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Лог синхронизации
export interface BankSyncLog {
  id: string;
  company_id: string;
  connection_id: string;
  sync_type: SyncType;
  started_at: string;
  finished_at?: string;
  status: SyncStatus;
  accounts_synced: number;
  transactions_fetched: number;
  transactions_new: number;
  transactions_updated: number;
  error_message?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

// Input типы
export interface CreateConnectionInput {
  bank_code: BankCode;
  bank_name: string;
  credentials?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  auto_sync_enabled?: boolean;
  sync_interval_minutes?: number;
}

export interface CreateRuleInput {
  name: string;
  rule_type: RuleType;
  conditions: Record<string, unknown>;
  action_type: ActionType;
  action_params: Record<string, unknown>;
  priority?: number;
}

export interface ImportStatementInput {
  bank_account_id: string;
  file_path: string;
  file_format: 'csv' | '1c' | 'mt940';
}

// Сводка по синхронизации
export interface BankSyncSummary {
  totalConnections: number;
  activeConnections: number;
  lastSyncDate?: string;
  pendingTransactions: number;
  processedToday: number;
}

// Лейблы
export const bankCodeLabels: Record<BankCode, string> = {
  sber: 'Сбербанк',
  alfa: 'Альфа-Банк',
  vtb: 'ВТБ',
  tochka: 'Точка',
  raiffeisen: 'Райффайзен',
  tinkoff: 'Тинькофф',
  otkritie: 'Открытие',
  other: 'Другой',
};

export const connectionStatusLabels: Record<ConnectionStatus, string> = {
  pending: 'Ожидает настройки',
  active: 'Активно',
  expired: 'Истекло',
  error: 'Ошибка',
  disabled: 'Отключено',
};

export const processingStatusLabels: Record<ProcessingStatus, string> = {
  new: 'Новая',
  matched: 'Сопоставлена',
  created: 'Документ создан',
  ignored: 'Пропущена',
  error: 'Ошибка',
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  debit: 'Списание',
  credit: 'Зачисление',
};

export const ruleTypeLabels: Record<RuleType, string> = {
  counterparty: 'По контрагенту',
  purpose: 'По назначению',
  amount: 'По сумме',
  combined: 'Комбинированное',
};

export const actionTypeLabels: Record<ActionType, string> = {
  categorize: 'Категоризация',
  link_counterparty: 'Привязка контрагента',
  create_document: 'Создание документа',
  ignore: 'Игнорировать',
};
