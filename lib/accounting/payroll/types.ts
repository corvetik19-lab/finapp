// Типы для зарплатного модуля

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'gph';
export type EmployeeStatus = 'active' | 'on_leave' | 'terminated';
export type PayrollPeriodStatus = 'open' | 'calculated' | 'approved' | 'paid' | 'closed';
export type PayslipStatus = 'draft' | 'calculated' | 'approved' | 'paid';
export type AccrualType = 'accrual' | 'deduction';
export type CalculationType = 'fixed' | 'percent' | 'hourly' | 'daily';

// Должность
export interface PayrollPosition {
  id: string;
  company_id: string;
  name: string;
  department?: string;
  base_salary: number;
  regional_bonus_percent: number;
  northern_bonus_percent: number;
  headcount: number;
  filled_count: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePositionInput {
  name: string;
  department?: string;
  base_salary: number;
  regional_bonus_percent?: number;
  northern_bonus_percent?: number;
  headcount?: number;
  notes?: string;
}

// Сотрудник
export interface PayrollEmployee {
  id: string;
  company_id: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  birth_date?: string;
  gender?: 'male' | 'female';
  passport_series?: string;
  passport_number?: string;
  passport_issued_by?: string;
  passport_issued_date?: string;
  inn?: string;
  snils?: string;
  phone?: string;
  email?: string;
  address?: string;
  position_id?: string;
  department?: string;
  employment_type: EmploymentType;
  work_rate: number;
  salary: number;
  hire_date: string;
  termination_date?: string;
  status: EmployeeStatus;
  has_children: boolean;
  children_count: number;
  is_disabled: boolean;
  is_single_parent: boolean;
  user_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  position?: PayrollPosition;
}

export interface CreateEmployeeInput {
  last_name: string;
  first_name: string;
  middle_name?: string;
  birth_date?: string;
  gender?: 'male' | 'female';
  passport_series?: string;
  passport_number?: string;
  passport_issued_by?: string;
  passport_issued_date?: string;
  inn?: string;
  snils?: string;
  phone?: string;
  email?: string;
  address?: string;
  position_id?: string;
  department?: string;
  employment_type?: EmploymentType;
  work_rate?: number;
  salary: number;
  hire_date: string;
  has_children?: boolean;
  children_count?: number;
  is_disabled?: boolean;
  is_single_parent?: boolean;
  user_id?: string;
  notes?: string;
}

// Расчётный период
export interface PayrollPeriod {
  id: string;
  company_id: string;
  period_year: number;
  period_month: number;
  status: PayrollPeriodStatus;
  start_date: string;
  end_date: string;
  payment_date?: string;
  total_accrued: number;
  total_deducted: number;
  total_to_pay: number;
  total_ndfl: number;
  calculated_at?: string;
  calculated_by?: string;
  approved_at?: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
}

// Расчётный листок
export interface PayrollPayslip {
  id: string;
  company_id: string;
  period_id: string;
  employee_id: string;
  worked_days: number;
  worked_hours: number;
  sick_days: number;
  vacation_days: number;
  salary_accrued: number;
  bonus_accrued: number;
  vacation_accrued: number;
  sick_accrued: number;
  other_accrued: number;
  total_accrued: number;
  ndfl_amount: number;
  advance_deducted: number;
  alimony_amount: number;
  other_deducted: number;
  total_deducted: number;
  to_pay: number;
  status: PayslipStatus;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  employee?: PayrollEmployee;
  period?: PayrollPeriod;
}

// Тип начисления/удержания
export interface PayrollAccrualType {
  id: string;
  company_id: string;
  code: string;
  name: string;
  type: AccrualType;
  calculation_type: CalculationType;
  is_taxable: boolean;
  is_insurance_base: boolean;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

// Аванс
export interface PayrollAdvance {
  id: string;
  company_id: string;
  employee_id: string;
  period_id?: string;
  amount: number;
  payment_date: string;
  status: 'planned' | 'paid' | 'cancelled';
  paid_at?: string;
  notes?: string;
  created_at: string;
}

// Сводка по зарплате
export interface PayrollSummary {
  period: PayrollPeriod | null;
  employeesCount: number;
  totalAccrued: number;
  totalDeducted: number;
  totalToPay: number;
  totalNdfl: number;
  paidCount: number;
  unpaidCount: number;
}

// Лейблы
export const employmentTypeLabels: Record<EmploymentType, string> = {
  full_time: 'Полная занятость',
  part_time: 'Частичная занятость',
  contract: 'Контракт',
  gph: 'ГПХ',
};

export const employeeStatusLabels: Record<EmployeeStatus, string> = {
  active: 'Работает',
  on_leave: 'В отпуске',
  terminated: 'Уволен',
};

export const periodStatusLabels: Record<PayrollPeriodStatus, string> = {
  open: 'Открыт',
  calculated: 'Рассчитан',
  approved: 'Утверждён',
  paid: 'Оплачен',
  closed: 'Закрыт',
};

export const payslipStatusLabels: Record<PayslipStatus, string> = {
  draft: 'Черновик',
  calculated: 'Рассчитан',
  approved: 'Утверждён',
  paid: 'Выплачен',
};

export const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
