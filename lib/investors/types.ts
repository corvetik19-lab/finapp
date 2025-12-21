// Типы для модуля Инвесторы

// ============================================
// Типы источников финансирования
// ============================================

export type SourceType = "bank" | "private" | "fund" | "factoring" | "leasing" | "guarantee" | "tender_loan" | "crowdfunding" | "other";

export interface InvestmentSource {
  id: string;
  user_id: string;
  source_type: SourceType;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  bank_bik: string | null;
  bank_account: string | null;
  correspondent_account: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  legal_address: string | null;
  default_interest_rate: number | null;
  default_period_days: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Новые поля
  reliability_score: number;
  total_invested: number;
  total_returned: number;
  average_delay_days: number;
  preferred_tender_types: string[] | null;
  min_investment_amount: number | null;
  max_investment_amount: number | null;
  available_credit_limit: number | null;
  last_interaction_at: string | null;
}

export interface CreateSourceInput {
  source_type: SourceType;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  bank_bik?: string;
  bank_account?: string;
  correspondent_account?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legal_address?: string;
  default_interest_rate?: number;
  default_period_days?: number;
  notes?: string;
}

export interface UpdateSourceInput extends Partial<CreateSourceInput> {
  is_active?: boolean;
}

// ============================================
// Типы инвестиций
// ============================================

export type InterestType = "annual" | "monthly" | "fixed";

export type FundingStage = "application" | "security" | "execution" | "warranty";

export type InvestmentStatus =
  | "draft"
  | "requested"
  | "approved"
  | "received"
  | "in_progress"
  | "returning"
  | "completed"
  | "overdue"
  | "cancelled";

export interface Investment {
  id: string;
  user_id: string;
  source_id: string;
  tender_id: string | null;
  investment_number: string;
  investment_date: string;
  requested_amount: number;
  approved_amount: number;
  received_amount: number;
  interest_rate: number;
  interest_type: InterestType;
  period_days: number;
  due_date: string;
  interest_amount: number;
  total_return_amount: number;
  returned_principal: number;
  returned_interest: number;
  tender_total_cost: number | null;
  own_funds_amount: number;
  investment_share: number | null;
  status: InvestmentStatus;
  contract_url: string | null;
  purpose: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Новые поля для интеграции с тендерами
  funding_stage: FundingStage | null;
  tender_stage_id: string | null;
  target_expense_category: string | null;
  penalty_rate: number;
  penalty_grace_days: number;
  accumulated_penalty: number;
  early_return_allowed: boolean;
  early_return_penalty_rate: number | null;
  collateral_description: string | null;
  collateral_value: number | null;
  guarantor_id: string | null;
  rating: number | null;
  // Связанные данные
  source?: InvestmentSource;
  tender?: {
    id: string;
    subject: string;
    purchase_number: string;
  };
}

export interface CreateInvestmentInput {
  source_id: string;
  tender_id?: string;
  investment_number: string;
  investment_date: string;
  requested_amount: number;
  approved_amount: number;
  interest_rate: number;
  interest_type?: InterestType;
  period_days: number;
  due_date: string;
  tender_total_cost?: number;
  own_funds_amount?: number;
  purpose?: string;
  notes?: string;
  contract_url?: string;
}

export interface UpdateInvestmentInput extends Partial<CreateInvestmentInput> {
  status?: InvestmentStatus;
  received_amount?: number;
}

// ============================================
// Типы транзакций
// ============================================

export type TransactionType =
  | "receipt"
  | "return_principal"
  | "return_interest"
  | "penalty"
  | "adjustment";

export interface InvestmentTransaction {
  id: string;
  user_id: string;
  investment_id: string;
  transaction_type: TransactionType;
  amount: number;
  transaction_date: string;
  document_number: string | null;
  document_date: string | null;
  accounting_document_id: string | null;
  bank_operation_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateTransactionInput {
  investment_id: string;
  transaction_type: TransactionType;
  amount: number;
  transaction_date: string;
  document_number?: string;
  document_date?: string;
  accounting_document_id?: string;
  bank_operation_id?: string;
  notes?: string;
}

// ============================================
// Типы графика возвратов
// ============================================

export type ScheduleStatus = "pending" | "partial" | "paid" | "overdue";

export interface ReturnScheduleItem {
  id: string;
  user_id: string;
  investment_id: string;
  payment_number: number;
  scheduled_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  paid_amount: number;
  paid_date: string | null;
  status: ScheduleStatus;
  notes: string | null;
  created_at: string;
}

export interface CreateScheduleItemInput {
  investment_id: string;
  payment_number: number;
  scheduled_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
}

// ============================================
// Типы доступа инвесторов
// ============================================

export type AccessStatus = "pending" | "active" | "revoked";

export interface InvestorAccess {
  id: string;
  user_id: string;
  source_id: string;
  investor_email: string;
  investor_user_id: string | null;
  can_view_tender_details: boolean;
  can_view_documents: boolean;
  can_view_financials: boolean;
  can_download_reports: boolean;
  status: AccessStatus;
  invite_token: string | null;
  invite_sent_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
  // Связанные данные
  source?: InvestmentSource;
}

export interface CreateAccessInput {
  source_id: string;
  investor_email: string;
  can_view_tender_details?: boolean;
  can_view_documents?: boolean;
  can_view_financials?: boolean;
  can_download_reports?: boolean;
}

export interface UpdateAccessInput {
  can_view_tender_details?: boolean;
  can_view_documents?: boolean;
  can_view_financials?: boolean;
  can_download_reports?: boolean;
  status?: AccessStatus;
}

// ============================================
// Типы для расчётов
// ============================================

export interface InterestCalculation {
  principal: number;
  interestRate: number;
  interestType: InterestType;
  periodDays: number;
  interestAmount: number;
  totalReturn: number;
}

export interface FundingStructure {
  tenderTotalCost: number;
  investments: {
    sourceId: string;
    sourceName: string;
    amount: number;
    share: number;
    interestRate: number;
    interestAmount: number;
  }[];
  ownFunds: number;
  ownFundsShare: number;
  totalInterestCost: number;
}

// ============================================
// Типы для дашборда
// ============================================

export interface InvestorsDashboardData {
  totalInvested: number;
  totalToReturn: number;
  totalReturned: number;
  totalOverdue: number;
  activeInvestmentsCount: number;
  pendingReturnsCount: number;
  topSources: {
    id: string;
    name: string;
    totalAmount: number;
    activeCount: number;
  }[];
  upcomingReturns: {
    id: string;
    investmentNumber: string;
    sourceName: string;
    dueDate: string;
    amount: number;
  }[];
  recentTransactions: InvestmentTransaction[];
}

// ============================================
// Типы для портала инвестора
// ============================================

export interface InvestorPortalData {
  source: InvestmentSource;
  investments: Investment[];
  totalInvested: number;
  totalReturned: number;
  totalPending: number;
}

export interface InvestorInvestmentView {
  investment: Investment;
  schedule: ReturnScheduleItem[];
  transactions: InvestmentTransaction[];
  tender?: {
    id: string;
    subject: string;
    purchase_number: string;
    status: string;
  };
}

// ============================================
// Константы
// ============================================

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  bank: "Банк",
  private: "Частный инвестор",
  fund: "Инвестиционный фонд",
  factoring: "Факторинг",
  leasing: "Лизинг",
  guarantee: "Банковская гарантия",
  tender_loan: "Тендерный займ",
  crowdfunding: "Краудфандинг",
  other: "Другое",
};

export const INTEREST_TYPE_LABELS: Record<InterestType, string> = {
  annual: "Годовая",
  monthly: "Месячная",
  fixed: "Фиксированная",
};

export const INVESTMENT_STATUS_LABELS: Record<InvestmentStatus, string> = {
  draft: "Черновик",
  requested: "Запрошено",
  approved: "Одобрено",
  received: "Средства получены",
  in_progress: "В процессе",
  returning: "Идёт возврат",
  completed: "Завершено",
  overdue: "Просрочено",
  cancelled: "Отменено",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  receipt: "Получение средств",
  return_principal: "Возврат основного долга",
  return_interest: "Выплата процентов",
  penalty: "Штраф/пеня",
  adjustment: "Корректировка",
};

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  pending: "Ожидает",
  partial: "Частично оплачен",
  paid: "Оплачен",
  overdue: "Просрочен",
};

export const ACCESS_STATUS_LABELS: Record<AccessStatus, string> = {
  pending: "Ожидает активации",
  active: "Активен",
  revoked: "Отозван",
};

// ============================================
// Типы банковских гарантий
// ============================================

export type GuaranteeType = "application" | "contract" | "warranty" | "advance";

export type GuaranteeStatus = "draft" | "pending" | "active" | "expired" | "claimed" | "returned";

export interface BankGuarantee {
  id: string;
  user_id: string;
  company_id: string | null;
  tender_id: string | null;
  source_id: string | null;
  guarantee_type: GuaranteeType;
  guarantee_number: string | null;
  issue_date: string;
  start_date: string;
  end_date: string;
  guarantee_amount: number;
  commission_amount: number;
  commission_rate: number | null;
  status: GuaranteeStatus;
  bank_name: string | null;
  bank_bik: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Связанные данные
  source?: InvestmentSource;
  tender?: {
    id: string;
    subject: string;
    purchase_number: string;
  };
}

export interface CreateGuaranteeInput {
  tender_id?: string;
  source_id?: string;
  guarantee_type: GuaranteeType;
  guarantee_number?: string;
  issue_date: string;
  start_date: string;
  end_date: string;
  guarantee_amount: number;
  commission_amount?: number;
  commission_rate?: number;
  bank_name?: string;
  bank_bik?: string;
  document_url?: string;
  notes?: string;
}

export interface UpdateGuaranteeInput extends Partial<CreateGuaranteeInput> {
  status?: GuaranteeStatus;
}

export const GUARANTEE_TYPE_LABELS: Record<GuaranteeType, string> = {
  application: "Обеспечение заявки",
  contract: "Обеспечение контракта",
  warranty: "Гарантийные обязательства",
  advance: "Обеспечение аванса",
};

export const GUARANTEE_STATUS_LABELS: Record<GuaranteeStatus, string> = {
  draft: "Черновик",
  pending: "Ожидает выпуска",
  active: "Действует",
  expired: "Истекла",
  claimed: "Предъявлена",
  returned: "Возвращена",
};

export const FUNDING_STAGE_LABELS: Record<FundingStage, string> = {
  application: "Подача заявки",
  security: "Обеспечение",
  execution: "Исполнение",
  warranty: "Гарантийный период",
};

// ============================================
// Типы связи инвестиций с расходами
// ============================================

export interface InvestmentExpenseLink {
  id: string;
  user_id: string;
  company_id: string | null;
  investment_id: string;
  expense_id: string;
  amount: number;
  notes: string | null;
  created_at: string;
}
