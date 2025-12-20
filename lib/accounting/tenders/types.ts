// Типы для интеграции бухгалтерии с тендерами

// ============================================
// Бюджет тендера
// ============================================

export interface TenderBudget {
  id: string;
  company_id: string;
  tender_id: string;
  
  // Плановые доходы
  planned_revenue: number;
  
  // Плановые расходы
  planned_materials: number;
  planned_labor: number;
  planned_subcontractors: number;
  planned_transport: number;
  planned_overhead: number;
  planned_other: number;
  planned_total_expense: number;
  planned_profit: number;
  
  // Фактические показатели
  actual_revenue: number;
  actual_expense: number;
  actual_profit: number;
  
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  items?: TenderBudgetItem[];
}

export type BudgetCategory = 'materials' | 'labor' | 'subcontractors' | 'transport' | 'overhead' | 'other';

export interface TenderBudgetItem {
  id: string;
  budget_id: string;
  category: BudgetCategory;
  name: string;
  description?: string;
  planned_amount: number;
  actual_amount: number;
  unit?: string;
  quantity?: number;
  price_per_unit?: number;
  position: number;
  created_at: string;
}

export interface CreateTenderBudgetInput {
  tender_id: string;
  planned_revenue: number;
  planned_materials?: number;
  planned_labor?: number;
  planned_subcontractors?: number;
  planned_transport?: number;
  planned_overhead?: number;
  planned_other?: number;
  notes?: string;
}

export interface CreateBudgetItemInput {
  category: BudgetCategory;
  name: string;
  description?: string;
  planned_amount: number;
  unit?: string;
  quantity?: number;
  price_per_unit?: number;
}

// ============================================
// Этапы оплаты
// ============================================

export type PaymentConditionType = 'advance' | 'milestone' | 'delivery' | 'acceptance' | 'final';
export type PaymentStageStatus = 'pending' | 'invoiced' | 'partial' | 'paid' | 'overdue';

export interface TenderPaymentStage {
  id: string;
  company_id: string;
  tender_id: string;
  
  stage_number: number;
  name: string;
  description?: string;
  
  amount: number;
  percentage?: number;
  
  condition_type?: PaymentConditionType;
  condition_description?: string;
  
  planned_date?: string;
  actual_date?: string;
  due_date?: string;
  
  status: PaymentStageStatus;
  
  invoice_id?: string;
  paid_amount: number;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentStageInput {
  tender_id: string;
  name: string;
  description?: string;
  amount: number;
  percentage?: number;
  condition_type?: PaymentConditionType;
  condition_description?: string;
  planned_date?: string;
  due_date?: string;
  notes?: string;
}

// ============================================
// Обеспечение контракта
// ============================================

export type GuaranteeType = 'bid' | 'contract' | 'advance' | 'warranty' | 'deposit';
export type GuaranteeForm = 'bank_guarantee' | 'deposit' | 'insurance' | 'retention';
export type GuaranteeStatus = 'pending' | 'active' | 'expired' | 'returned' | 'claimed';

export interface TenderGuarantee {
  id: string;
  company_id: string;
  tender_id: string;
  
  guarantee_type: GuaranteeType;
  guarantee_form?: GuaranteeForm;
  
  amount: number;
  currency: string;
  
  bank_name?: string;
  guarantee_number?: string;
  
  issue_date?: string;
  valid_from?: string;
  valid_until: string;
  return_date?: string;
  
  status: GuaranteeStatus;
  
  bank_account_id?: string;
  
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGuaranteeInput {
  tender_id: string;
  guarantee_type: GuaranteeType;
  guarantee_form?: GuaranteeForm;
  amount: number;
  currency?: string;
  bank_name?: string;
  guarantee_number?: string;
  issue_date?: string;
  valid_from?: string;
  valid_until: string;
  bank_account_id?: string;
  notes?: string;
}

// ============================================
// Пени и штрафы
// ============================================

export type PenaltyType = 'delay' | 'quality' | 'breach' | 'other';
export type PenaltyDirection = 'income' | 'expense';
export type PenaltyStatus = 'accrued' | 'disputed' | 'paid' | 'written_off';

export interface TenderPenalty {
  id: string;
  company_id: string;
  tender_id: string;
  
  penalty_type: PenaltyType;
  direction: PenaltyDirection;
  
  amount: number;
  calculated_amount?: number;
  
  basis?: string;
  calculation_method?: string;
  
  accrual_date: string;
  due_date?: string;
  paid_date?: string;
  
  status: PenaltyStatus;
  
  document_id?: string;
  
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CreatePenaltyInput {
  tender_id: string;
  penalty_type: PenaltyType;
  direction: PenaltyDirection;
  amount: number;
  calculated_amount?: number;
  basis?: string;
  calculation_method?: string;
  accrual_date: string;
  due_date?: string;
  notes?: string;
}

// ============================================
// Субподрядчики
// ============================================

export type SubcontractorStatus = 'draft' | 'active' | 'completed' | 'terminated';

export interface TenderSubcontractor {
  id: string;
  company_id: string;
  tender_id: string;
  counterparty_id?: string;
  
  name: string;
  inn?: string;
  
  work_description?: string;
  contract_amount?: number;
  paid_amount: number;
  
  status: SubcontractorStatus;
  
  contract_number?: string;
  contract_date?: string;
  
  notes?: string;
  created_at: string;
}

export interface CreateSubcontractorInput {
  tender_id: string;
  counterparty_id?: string;
  name: string;
  inn?: string;
  work_description?: string;
  contract_amount?: number;
  contract_number?: string;
  contract_date?: string;
  notes?: string;
}

// ============================================
// Сводные данные
// ============================================

export interface TenderFinancialSummary {
  tender_id: string;
  
  // Бюджет
  budget?: TenderBudget;
  
  // Оплаты
  payment_stages: TenderPaymentStage[];
  total_invoiced: number;
  total_paid: number;
  total_pending: number;
  
  // Гарантии
  guarantees: TenderGuarantee[];
  total_guarantees: number;
  active_guarantees: number;
  
  // Пени
  penalties: TenderPenalty[];
  total_penalties_income: number;
  total_penalties_expense: number;
  
  // Субподрядчики
  subcontractors: TenderSubcontractor[];
  total_subcontract_amount: number;
  total_subcontract_paid: number;
  
  // Маржинальность
  margin_plan: number;
  margin_fact: number;
  margin_deviation: number;
}

// Типы для лейблов
export const guaranteeTypeLabels: Record<GuaranteeType, string> = {
  bid: 'Обеспечение заявки',
  contract: 'Обеспечение контракта',
  advance: 'Обеспечение аванса',
  warranty: 'Гарантийные обязательства',
  deposit: 'Залоговый депозит',
};

export const guaranteeFormLabels: Record<GuaranteeForm, string> = {
  bank_guarantee: 'Банковская гарантия',
  deposit: 'Денежный депозит',
  insurance: 'Страхование',
  retention: 'Удержание из оплаты',
};

export const penaltyTypeLabels: Record<PenaltyType, string> = {
  delay: 'Просрочка',
  quality: 'Качество',
  breach: 'Нарушение условий',
  other: 'Прочее',
};

export const budgetCategoryLabels: Record<BudgetCategory, string> = {
  materials: 'Материалы',
  labor: 'Оплата труда',
  subcontractors: 'Субподряд',
  transport: 'Транспорт',
  overhead: 'Накладные',
  other: 'Прочее',
};
