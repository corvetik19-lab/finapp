/**
 * Типы и интерфейсы для системы управления сотрудниками
 */

// =====================================================
// Enum типы
// =====================================================

export type EmployeeRole = 
  | 'admin'              // Администратор
  | 'manager'            // Менеджер
  | 'tender_specialist'  // Тендерный специалист
  | 'accountant'         // Бухгалтер
  | 'logistics'          // Логист
  | 'viewer';            // Наблюдатель

export type EmployeeStatus =
  | 'active'     // Активный
  | 'inactive'   // Неактивный
  | 'vacation'   // В отпуске
  | 'dismissed'; // Уволен

// =====================================================
// Основной интерфейс сотрудника
// =====================================================

export interface Employee {
  id: string;
  user_id?: string;
  company_id: string;
  
  // Персональные данные
  full_name: string;
  email: string;
  phone?: string;
  telegram?: string;
  birth_date?: string;
  avatar_url?: string;
  
  // Рабочие данные
  position?: string;
  department?: string;
  employee_number?: string;
  hire_date?: string;
  dismissal_date?: string;
  
  // Роли и доступ
  role: EmployeeRole;
  status: EmployeeStatus;
  permissions?: Record<string, boolean>;
  
  // Контактная информация
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  
  // Рабочие параметры
  salary_amount?: number; // в копейках
  work_schedule?: string;
  notes?: string;
  
  // Метаданные
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  deleted_at?: string;
}

// =====================================================
// История изменений
// =====================================================

export interface EmployeeHistory {
  id: string;
  employee_id: string;
  company_id: string;
  action: 'created' | 'updated' | 'role_changed' | 'status_changed';
  changes: Record<string, unknown>;
  changed_by?: string;
  changed_at: string;
  comment?: string;
}

// =====================================================
// Навыки сотрудника
// =====================================================

export interface EmployeeSkill {
  id: string;
  employee_id: string;
  company_id: string;
  skill_name: string;
  skill_level: 1 | 2 | 3 | 4 | 5;
  description?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Формы для создания/обновления
// =====================================================

export interface CreateEmployeeData {
  company_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  telegram?: string | null;
  birth_date?: string | null;
  position?: string | null;
  department?: string | null;
  role: EmployeeRole;
  status?: EmployeeStatus;
  hire_date?: string | null;
  work_schedule?: string | null;
  notes?: string | null;
  
  // Для создания учетной записи
  create_user_account?: boolean;
  password?: string | null;
}

export interface UpdateEmployeeData {
  full_name?: string;
  email?: string;
  phone?: string | null;
  telegram?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  position?: string | null;
  department?: string | null;
  employee_number?: string | null;
  hire_date?: string | null;
  dismissal_date?: string | null;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  permissions?: Record<string, boolean>;
  address?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  salary_amount?: number | null;
  work_schedule?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

// =====================================================
// Фильтры и поиск
// =====================================================

export interface EmployeeFilters {
  search?: string;
  role?: EmployeeRole;
  status?: EmployeeStatus;
  department?: string;
  position?: string;
  hire_date_from?: string;
  hire_date_to?: string;
}

// =====================================================
// Статистика
// =====================================================

export interface EmployeeStats {
  total_count: number;
  active_count: number;
  inactive_count: number;
  on_vacation_count: number;
  by_role: Record<EmployeeRole, number>;
}

// =====================================================
// Расширенный профиль сотрудника (с дополнительными данными)
// =====================================================

export interface EmployeeProfile extends Employee {
  skills?: EmployeeSkill[];
  history?: EmployeeHistory[];
  assigned_tenders_count?: number;
  completed_tenders_count?: number;
  success_rate?: number;
}

// =====================================================
// Константы для отображения
// =====================================================

export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  tender_specialist: 'Тендерный специалист',
  accountant: 'Бухгалтер',
  logistics: 'Логист',
  viewer: 'Наблюдатель',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Активный',
  inactive: 'Неактивный',
  vacation: 'В отпуске',
  dismissed: 'Уволен',
};

export const EMPLOYEE_STATUS_COLORS: Record<EmployeeStatus, string> = {
  active: '#10b981',    // green
  inactive: '#6b7280',  // gray
  vacation: '#3b82f6',  // blue
  dismissed: '#ef4444', // red
};

// =====================================================
// Права доступа по ролям
// =====================================================

export const ROLE_PERMISSIONS: Record<EmployeeRole, string[]> = {
  admin: [
    'employees.view',
    'employees.create',
    'employees.update',
    'employees.delete',
    'tenders.view',
    'tenders.create',
    'tenders.update',
    'tenders.delete',
    'reports.view',
    'settings.manage',
  ],
  manager: [
    'employees.view',
    'employees.create',
    'employees.update',
    'tenders.view',
    'tenders.create',
    'tenders.update',
    'reports.view',
  ],
  tender_specialist: [
    'employees.view',
    'tenders.view',
    'tenders.create',
    'tenders.update',
  ],
  accountant: [
    'employees.view',
    'tenders.view',
    'reports.view',
  ],
  logistics: [
    'employees.view',
    'tenders.view',
  ],
  viewer: [
    'employees.view',
    'tenders.view',
  ],
};
