// Типы для платёжного календаря

export type PaymentCalendarType = 'income' | 'expense';

export type PaymentCategory = 
  | 'customer_payment' 
  | 'supplier_payment' 
  | 'salary' 
  | 'tax' 
  | 'loan' 
  | 'rent' 
  | 'utilities' 
  | 'services' 
  | 'other';

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type PaymentCalendarStatus = 'planned' | 'confirmed' | 'paid' | 'cancelled' | 'overdue';

export type PaymentPriority = 'low' | 'normal' | 'high' | 'critical';

export interface PaymentCalendarItem {
  id: string;
  company_id: string;
  payment_type: PaymentCalendarType;
  category: PaymentCategory;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  planned_date: string;
  actual_date?: string;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_end_date?: string;
  parent_payment_id?: string;
  status: PaymentCalendarStatus;
  counterparty_id?: string;
  counterparty_name?: string;
  document_id?: string;
  tender_id?: string;
  bank_account_id?: string;
  priority: PaymentPriority;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentCalendarInput {
  payment_type: PaymentCalendarType;
  category: PaymentCategory;
  name: string;
  description?: string;
  amount: number;
  currency?: string;
  planned_date: string;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_end_date?: string;
  counterparty_id?: string;
  counterparty_name?: string;
  document_id?: string;
  tender_id?: string;
  bank_account_id?: string;
  priority?: PaymentPriority;
  notes?: string;
}

export interface CashForecast {
  id: string;
  company_id: string;
  forecast_date: string;
  opening_balance: number;
  planned_income: number;
  planned_expense: number;
  actual_income: number;
  actual_expense: number;
  closing_balance: number;
  actual_closing_balance: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentLimit {
  id: string;
  company_id: string;
  limit_type: 'daily' | 'weekly' | 'monthly' | 'per_payment';
  category?: PaymentCategory;
  counterparty_id?: string;
  amount_limit: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export interface CreatePaymentLimitInput {
  limit_type: 'daily' | 'weekly' | 'monthly' | 'per_payment';
  category?: PaymentCategory;
  counterparty_id?: string;
  amount_limit: number;
}

// Сводка по календарю
export interface PaymentCalendarSummary {
  today: {
    income: number;
    expense: number;
    balance: number;
  };
  thisWeek: {
    income: number;
    expense: number;
    balance: number;
  };
  thisMonth: {
    income: number;
    expense: number;
    balance: number;
  };
  overdue: {
    count: number;
    amount: number;
  };
  upcoming: {
    count: number;
    amount: number;
  };
}

// Лейблы
export const paymentCategoryLabels: Record<PaymentCategory, string> = {
  customer_payment: 'Оплата от клиента',
  supplier_payment: 'Оплата поставщику',
  salary: 'Зарплата',
  tax: 'Налоги',
  loan: 'Кредит/Займ',
  rent: 'Аренда',
  utilities: 'Коммунальные',
  services: 'Услуги',
  other: 'Прочее',
};

export const recurrencePatternLabels: Record<RecurrencePattern, string> = {
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  quarterly: 'Ежеквартально',
  yearly: 'Ежегодно',
};

export const paymentStatusLabels: Record<PaymentCalendarStatus, string> = {
  planned: 'Запланирован',
  confirmed: 'Подтверждён',
  paid: 'Оплачен',
  cancelled: 'Отменён',
  overdue: 'Просрочен',
};

export const paymentPriorityLabels: Record<PaymentPriority, string> = {
  low: 'Низкий',
  normal: 'Обычный',
  high: 'Высокий',
  critical: 'Критический',
};
