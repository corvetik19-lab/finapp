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
  
  // Get list of super_admin user IDs to exclude from employees list
  const { data: superAdmins } = await supabase
    .from('profiles')
    .select('id')
    .eq('global_role', 'super_admin');
  
  const superAdminIds = new Set((superAdmins || []).map(sa => sa.id));
  
  // Подгружаем связанную роль из таблицы roles
  let query = supabase
    .from('employees')
    .select(`
      *,
      role_data:roles!employees_role_id_fkey(
        id,
        name,
        description,
        color,
        permissions
      )
    `, { count: 'exact' })
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

  // Filter out super admins from the list (server-side filtering)
  const filteredData = (result.data || []).filter((emp: { user_id?: string }) => 
    !emp.user_id || !superAdminIds.has(emp.user_id)
  );

  // Подсчёт тендеров для каждого сотрудника
  const employeeIds = filteredData.map((e: { id: string }) => e.id);
  
  let tendersCountMap: Record<string, number> = {};
  
  if (employeeIds.length > 0) {
    const { data: tenderCounts } = await supabase
      .from('tenders')
      .select('responsible_id')
      .in('responsible_id', employeeIds)
      .is('deleted_at', null);
    
    if (tenderCounts) {
      tendersCountMap = tenderCounts.reduce((acc: Record<string, number>, t: { responsible_id: string }) => {
        acc[t.responsible_id] = (acc[t.responsible_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  // Получаем last_seen_at для user_id сотрудников
  const userIds = filteredData
    .map((e: { user_id?: string | null }) => e.user_id)
    .filter((id): id is string => !!id);
  
  let lastSeenMap: Record<string, string | null> = {};
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, last_seen_at')
      .in('id', userIds);
    
    if (profiles) {
      lastSeenMap = profiles.reduce((acc: Record<string, string | null>, p: { id: string; last_seen_at: string | null }) => {
        acc[p.id] = p.last_seen_at;
        return acc;
      }, {});
    }
  }

  // Добавляем tenders_count и last_seen_at к каждому сотруднику
  const employeesWithData = filteredData.map((emp: Employee & { user_id?: string | null }) => ({
    ...emp,
    tenders_count: tendersCountMap[emp.id] || 0,
    last_seen_at: emp.user_id ? lastSeenMap[emp.user_id] || null : null,
  }));
  
  return {
    data: employeesWithData,
    count: filteredData.length,
    page,
    limit,
  };
}

/**
 * Получить сотрудника по ID
 */
export async function getEmployeeById(id: string) {
  const supabase = await createClient();
  
  // Подгружаем данные роли
  const result = await supabase
    .from('employees')
    .select(`
      *,
      role_data:roles!employees_role_id_fkey(
        id,
        name,
        description,
        color,
        permissions
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  
  if (result.error) {
    console.error('Error fetching employee:', result.error);
    throw new Error(result.error.message);
  }
  
  return result.data as Employee & { role_data?: { id: string; name: string; description: string; color: string; permissions: string[] } };
}

/**
 * Получить статистику сотрудника по тендерам
 */
export async function getEmployeeTenderStats(employeeId: string) {
  const supabase = await createClient();
  
  // Получаем тендеры, назначенные на сотрудника
  const { data: tenders, error } = await supabase
    .from('tenders')
    .select('id, status, nmck')
    .eq('responsible_id', employeeId)
    .is('deleted_at', null);
  
  if (error) {
    console.error('Error fetching employee tender stats:', error);
    return {
      total: 0,
      won: 0,
      lost: 0,
      in_progress: 0,
      success_rate: 0,
      total_nmck: 0,
      won_nmck: 0
    };
  }
  
  const total = tenders?.length || 0;
  const won = tenders?.filter(t => t.status === 'won').length || 0;
  const lost = tenders?.filter(t => t.status === 'lost').length || 0;
  const in_progress = tenders?.filter(t => ['draft', 'preparation', 'submitted', 'consideration'].includes(t.status)).length || 0;
  const completed = won + lost;
  const success_rate = completed > 0 ? Math.round((won / completed) * 100) : 0;
  
  const total_nmck = tenders?.reduce((sum, t) => sum + (t.nmck || 0), 0) || 0;
  const won_nmck = tenders?.filter(t => t.status === 'won').reduce((sum, t) => sum + (t.nmck || 0), 0) || 0;
  
  return {
    total,
    won,
    lost,
    in_progress,
    success_rate,
    total_nmck,
    won_nmck
  };
}

/**
 * Создать нового сотрудника
 * Теперь пользователь выбирается из списка существующих, а не создаётся
 */
export async function createEmployee(data: CreateEmployeeData) {
  const supabase = await createClient();
  
  // Проверяем, что user_id (если передан) не назначен другому сотруднику
  if (data.user_id) {
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('user_id', data.user_id)
      .eq('company_id', data.company_id)
      .maybeSingle();
    
    if (existingEmployee) {
      throw new Error(`Этот пользователь уже привязан к сотруднику: ${existingEmployee.full_name}`);
    }
  }
  
  // Создаем запись сотрудника
  const employeeData = {
    ...data,
    status: data.status || 'active',
  };
  
  // Удаляем поля, которых нет в таблице
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { create_user_account, password, role, ...dbData } = employeeData;
  
  // Если role - это UUID, то это role_id
  if (role && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(role)) {
    (dbData as Record<string, unknown>).role_id = role;
  } else if (role) {
    // Иначе это enum значение
    (dbData as Record<string, unknown>).role = role;
  }
  
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
  
  // Получаем всех сотрудников для подсчёта статистики
  const result = await supabase
    .from('employees')
    .select('status, department, role, role_id')
    .eq('company_id', companyId)
    .is('deleted_at', null);
  
  if (result.error) {
    console.error('Error fetching employees stats:', result.error);
    throw new Error(result.error.message);
  }
  
  const employees = result.data || [];
  
  // Подсчёт по статусам
  const by_status: Record<string, number> = {};
  employees.forEach(e => {
    const status = e.status || 'active';
    by_status[status] = (by_status[status] || 0) + 1;
  });
  
  // Подсчёт по отделам
  const by_department: Record<string, number> = {};
  employees.forEach(e => {
    if (e.department) {
      by_department[e.department] = (by_department[e.department] || 0) + 1;
    }
  });
  
  // Подсчёт по ролям
  const by_role: Record<string, number> = {};
  employees.forEach(e => {
    const role = e.role_id || e.role || 'viewer';
    by_role[role] = (by_role[role] || 0) + 1;
  });
  
  return {
    total: employees.length,
    total_count: employees.length,
    active_count: by_status['active'] || 0,
    inactive_count: by_status['inactive'] || 0,
    on_vacation_count: by_status['vacation'] || 0,
    by_status,
    by_department,
    by_role,
  };
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
