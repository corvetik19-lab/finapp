'use server';

import { createRSCClient } from '@/lib/supabase/server';

// Alias для удобства
const createClient = createRSCClient;
import type {
  Employee,
  CreateEmployeeData,
  UpdateEmployeeData,
  EmployeeFilters,
  EmployeeStats,
  EmployeeSkill,
} from './types';

/**
 * Получить список сотрудников с фильтрацией
 */
export async function getEmployees(
  companyId: string,
  filters?: EmployeeFilters,
  page: number = 1,
  limit: number = 50
) {
  const supabase = await createClient();
  
  let query = supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .is('deleted_at', null);
  
  // Применяем фильтры
  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }
  
  if (filters?.role) {
    query = query.eq('role', filters.role);
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.department) {
    query = query.eq('department', filters.department);
  }
  
  if (filters?.position) {
    query = query.ilike('position', `%${filters.position}%`);
  }
  
  if (filters?.hire_date_from) {
    query = query.gte('hire_date', filters.hire_date_from);
  }
  
  if (filters?.hire_date_to) {
    query = query.lte('hire_date', filters.hire_date_to);
  }
  
  // Пагинация
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  query = query
    .order('created_at', { ascending: false })
    .range(from, to);
  
  const result = await query;
  
  if (result.error) {
    console.error('Error fetching employees:', result.error);
    throw new Error(result.error.message);
  }
  
  return {
    data: result.data as Employee[],
    count: result.count || 0,
    page,
    limit,
  };
}

/**
 * Получить сотрудника по ID
 */
export async function getEmployeeById(id: string) {
  const supabase = await createClient();
  
  const result = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  
  if (result.error) {
    console.error('Error fetching employee:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data as Employee;
}

/**
 * Создать нового сотрудника
 */
export async function createEmployee(data: CreateEmployeeData) {
  const supabase = await createClient();
  
  // Если нужно создать учетную запись пользователя
  let userId: string | undefined;
  
  if (data.create_user_account && data.password) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
        },
      },
    });
    
    if (authError) {
      console.error('Error creating user account:', authError);
      throw new Error(`Ошибка создания учетной записи: ${authError.message}`);
    }
    
    userId = authData.user?.id;
  }
  
  // Создаем запись сотрудника
  const employeeData = {
    ...data,
    user_id: userId,
    status: data.status || 'active',
  };
  
  // Удаляем поля, которых нет в таблице
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { create_user_account, password, ...dbData } = employeeData;
  
  const result = await supabase
    .from('employees')
    .insert(dbData)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error creating employee:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data as Employee;
}

/**
 * Обновить данные сотрудника
 */
export async function updateEmployee(id: string, data: UpdateEmployeeData) {
  const supabase = await createClient();
  
  const result = await supabase
    .from('employees')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error updating employee:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data as Employee;
}

/**
 * Удалить сотрудника (мягкое удаление)
 */
export async function deleteEmployee(id: string) {
  const supabase = await createClient();
  
  const result = await supabase
    .from('employees')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error deleting employee:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data;
}

/**
 * Получить статистику по сотрудникам
 */
export async function getEmployeesStats(companyId: string): Promise<EmployeeStats> {
  const supabase = await createClient();
  
  const result = await supabase.rpc('get_employees_stats', {
    p_company_id: companyId,
  });
  
  if (result.error) {
    console.error('Error fetching employees stats:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data[0] as EmployeeStats;
}

/**
 * Получить навыки сотрудника
 */
export async function getEmployeeSkills(employeeId: string) {
  const supabase = await createClient();
  
  const result = await supabase
    .from('employee_skills')
    .select('*')
    .eq('employee_id', employeeId)
    .order('skill_level', { ascending: false });
  
  if (result.error) {
    console.error('Error fetching employee skills:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data as EmployeeSkill[];
}

/**
 * Добавить навык сотруднику
 */
export async function addEmployeeSkill(data: Omit<EmployeeSkill, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient();
  
  const result = await supabase
    .from('employee_skills')
    .insert(data)
    .select()
    .single();
  
  if (result.error) {
    console.error('Error adding employee skill:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data as EmployeeSkill;
}

/**
 * Получить историю изменений сотрудника
 */
export async function getEmployeeHistory(employeeId: string, limit: number = 50) {
  const supabase = await createClient();
  
  const result = await supabase
    .from('employee_history')
    .select('*')
    .eq('employee_id', employeeId)
    .order('changed_at', { ascending: false })
    .limit(limit);
  
  if (result.error) {
    console.error('Error fetching employee history:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data;
}

/**
 * Получить список отделов
 */
export async function getDepartments(companyId: string): Promise<string[]> {
  const supabase = await createClient();
  
  const result = await supabase
    .from('employees')
    .select('department')
    .eq('company_id', companyId)
    .not('department', 'is', null)
    .is('deleted_at', null);
  
  if (result.error) {
    console.error('Error fetching departments:', result.error);
    return [];
  }
  
  // Уникальные отделы
  const departments = [...new Set(result.data.map(item => item.department).filter(Boolean))];
  return departments as string[];
}

/**
 * Получить список должностей
 */
export async function getPositions(companyId: string): Promise<string[]> {
  const supabase = await createClient();
  
  const result = await supabase
    .from('employees')
    .select('position')
    .eq('company_id', companyId)
    .not('position', 'is', null)
    .is('deleted_at', null);
  
  if (result.error) {
    console.error('Error fetching positions:', result.error);
    return [];
  }
  
  // Уникальные должности
  const positions = [...new Set(result.data.map(item => item.position).filter(Boolean))];
  return positions as string[];
}
