/**
 * Клиентские утилиты для работы с сотрудниками
 */

import type { Employee, EmployeeRole } from './types';

/**
 * Получить список сотрудников для выпадающего списка
 */
export async function getEmployeesForSelect(
  companyId: string,
  role?: EmployeeRole
): Promise<Array<{ id: string; name: string; role: string }>> {
  try {
    const params = new URLSearchParams({
      company_id: companyId,
      ...(role && { role }),
      status: 'active', // Только активные
    });

    const response = await fetch(`/api/employees?${params}`);

    if (!response.ok) {
      console.error('Failed to fetch employees');
      return [];
    }

    const employees: Employee[] = await response.json();

    return employees.map((emp) => ({
      id: emp.id,
      name: emp.full_name,
      role: emp.role,
    }));
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
}

/**
 * Получить менеджеров для назначения на тендер
 */
export async function getManagersForTender(companyId: string) {
  const employees = await getEmployeesForSelect(companyId);
  // Фильтруем только менеджеров и админов
  return employees.filter(
    (emp) => emp.role === 'manager' || emp.role === 'admin'
  );
}

/**
 * Получить тендерных специалистов
 */
export async function getTenderSpecialists(companyId: string) {
  const employees = await getEmployeesForSelect(companyId);
  return employees.filter((emp) => emp.role === 'tender_specialist');
}

/**
 * Получить всех активных сотрудников
 */
export async function getAllActiveEmployees(companyId: string) {
  return getEmployeesForSelect(companyId);
}
