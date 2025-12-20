"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import {
  PayrollPosition,
  PayrollEmployee,
  PayrollPeriod,
  PayrollPayslip,
  PayrollSummary,
  CreatePositionInput,
  CreateEmployeeInput,
} from "./types";

// ============================================
// Должности
// ============================================

export async function getPositions(): Promise<PayrollPosition[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("payroll_positions")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    logger.error("Error fetching positions:", error);
    return [];
  }

  return data || [];
}

export async function createPosition(
  input: CreatePositionInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data, error } = await supabase
    .from("payroll_positions")
    .insert({
      company_id: companyId,
      name: input.name,
      department: input.department,
      base_salary: input.base_salary,
      regional_bonus_percent: input.regional_bonus_percent || 0,
      northern_bonus_percent: input.northern_bonus_percent || 0,
      headcount: input.headcount || 1,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating position:", error);
    return { success: false, error: "Ошибка создания должности" };
  }

  return { success: true, id: data.id };
}

// ============================================
// Сотрудники
// ============================================

export async function getEmployees(filters?: {
  status?: string;
  positionId?: string;
  department?: string;
}): Promise<PayrollEmployee[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("payroll_employees")
    .select(`
      *,
      position:payroll_positions(*)
    `)
    .eq("company_id", companyId)
    .order("last_name", { ascending: true });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.positionId) {
    query = query.eq("position_id", filters.positionId);
  }
  if (filters?.department) {
    query = query.eq("department", filters.department);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching employees:", error);
    return [];
  }

  return (data || []).map((emp) => ({
    ...emp,
    position: Array.isArray(emp.position) ? emp.position[0] : emp.position,
  }));
}

export async function getEmployee(id: string): Promise<PayrollEmployee | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("payroll_employees")
    .select(`
      *,
      position:payroll_positions(*)
    `)
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (error) {
    logger.error("Error fetching employee:", error);
    return null;
  }

  return {
    ...data,
    position: Array.isArray(data.position) ? data.position[0] : data.position,
  };
}

export async function createEmployee(
  input: CreateEmployeeInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data, error } = await supabase
    .from("payroll_employees")
    .insert({
      company_id: companyId,
      last_name: input.last_name,
      first_name: input.first_name,
      middle_name: input.middle_name,
      birth_date: input.birth_date,
      gender: input.gender,
      passport_series: input.passport_series,
      passport_number: input.passport_number,
      passport_issued_by: input.passport_issued_by,
      passport_issued_date: input.passport_issued_date,
      inn: input.inn,
      snils: input.snils,
      phone: input.phone,
      email: input.email,
      address: input.address,
      position_id: input.position_id,
      department: input.department,
      employment_type: input.employment_type || "full_time",
      work_rate: input.work_rate || 1,
      salary: input.salary,
      hire_date: input.hire_date,
      has_children: input.has_children || false,
      children_count: input.children_count || 0,
      is_disabled: input.is_disabled || false,
      is_single_parent: input.is_single_parent || false,
      user_id: input.user_id,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating employee:", error);
    return { success: false, error: "Ошибка добавления сотрудника" };
  }

  // Обновляем счётчик в должности
  if (input.position_id) {
    await supabase.rpc("increment_position_filled", {
      p_position_id: input.position_id,
    });
  }

  return { success: true, id: data.id };
}

export async function terminateEmployee(
  id: string,
  terminationDate: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("payroll_employees")
    .update({
      status: "terminated",
      termination_date: terminationDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error terminating employee:", error);
    return { success: false, error: "Ошибка увольнения сотрудника" };
  }

  return { success: true };
}

// ============================================
// Расчётные периоды
// ============================================

export async function getPayrollPeriods(year?: number): Promise<PayrollPeriod[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("payroll_periods")
    .select("*")
    .eq("company_id", companyId)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });

  if (year) {
    query = query.eq("period_year", year);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching payroll periods:", error);
    return [];
  }

  return data || [];
}

export async function getCurrentPeriod(): Promise<PayrollPeriod | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data, error } = await supabase
    .from("payroll_periods")
    .select("*")
    .eq("company_id", companyId)
    .eq("period_year", year)
    .eq("period_month", month)
    .single();

  if (error && error.code !== "PGRST116") {
    logger.error("Error fetching current period:", error);
    return null;
  }

  return data;
}

export async function createPayrollPeriod(
  year: number,
  month: number
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const { data, error } = await supabase
    .from("payroll_periods")
    .insert({
      company_id: companyId,
      period_year: year,
      period_month: month,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating payroll period:", error);
    return { success: false, error: "Ошибка создания периода" };
  }

  return { success: true, id: data.id };
}

// ============================================
// Расчётные листки
// ============================================

export async function getPayslips(filters?: {
  periodId?: string;
  year?: number;
  month?: number;
}): Promise<PayrollPayslip[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("payroll_payslips")
    .select(`
      *,
      employee:payroll_employees(*),
      period:payroll_periods(*)
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (filters?.periodId) {
    query = query.eq("period_id", filters.periodId);
  }

  if (filters?.year && filters?.month) {
    const { data: period } = await supabase
      .from("payroll_periods")
      .select("id")
      .eq("company_id", companyId)
      .eq("period_year", filters.year)
      .eq("period_month", filters.month)
      .single();
    
    if (period) {
      query = query.eq("period_id", period.id);
    } else {
      return [];
    }
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching payslips:", error);
    return [];
  }

  return (data || []).map((ps) => ({
    ...ps,
    employee: Array.isArray(ps.employee) ? ps.employee[0] : ps.employee,
  }));
}

export async function calculatePayslip(
  periodId: string,
  employeeId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем сотрудника
  const employee = await getEmployee(employeeId);
  if (!employee) {
    return { success: false, error: "Сотрудник не найден" };
  }

  // Получаем период
  const { data: period } = await supabase
    .from("payroll_periods")
    .select("*")
    .eq("id", periodId)
    .single();

  if (!period) {
    return { success: false, error: "Период не найден" };
  }

  // Простой расчёт (в реальности - сложнее)
  const workedDays = 22; // Рабочих дней в месяце (упрощённо)
  const salaryAccrued = Math.round(employee.salary * employee.work_rate);
  
  // Расчёт НДФЛ
  const { data: ndflData } = await supabase.rpc("calculate_ndfl", {
    p_taxable_amount: salaryAccrued,
    p_children_count: employee.children_count,
    p_is_disabled: employee.is_disabled,
    p_is_single_parent: employee.is_single_parent,
  });

  const ndflAmount = ndflData || Math.round(salaryAccrued * 0.13);

  // Создаём или обновляем расчётный листок
  const { data, error } = await supabase
    .from("payroll_payslips")
    .upsert({
      company_id: companyId,
      period_id: periodId,
      employee_id: employeeId,
      worked_days: workedDays,
      worked_hours: workedDays * 8,
      salary_accrued: salaryAccrued,
      ndfl_amount: ndflAmount,
      status: "calculated",
    }, {
      onConflict: "period_id,employee_id",
    })
    .select()
    .single();

  if (error) {
    logger.error("Error calculating payslip:", error);
    return { success: false, error: "Ошибка расчёта" };
  }

  return { success: true, id: data.id };
}

export async function calculateAllPayslips(
  periodId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем всех активных сотрудников
  const employees = await getEmployees({ status: "active" });

  let count = 0;
  for (const employee of employees) {
    const result = await calculatePayslip(periodId, employee.id);
    if (result.success) {
      count++;
    }
  }

  // Обновляем итоги периода
  const { data: payslips } = await supabase
    .from("payroll_payslips")
    .select("total_accrued, total_deducted, to_pay, ndfl_amount")
    .eq("period_id", periodId);

  const totals = (payslips || []).reduce(
    (acc, ps) => ({
      total_accrued: acc.total_accrued + (ps.total_accrued || 0),
      total_deducted: acc.total_deducted + (ps.total_deducted || 0),
      total_to_pay: acc.total_to_pay + (ps.to_pay || 0),
      total_ndfl: acc.total_ndfl + (ps.ndfl_amount || 0),
    }),
    { total_accrued: 0, total_deducted: 0, total_to_pay: 0, total_ndfl: 0 }
  );

  const { data: user } = await supabase.auth.getUser();

  await supabase
    .from("payroll_periods")
    .update({
      ...totals,
      status: "calculated",
      calculated_at: new Date().toISOString(),
      calculated_by: user?.user?.id,
    })
    .eq("id", periodId);

  return { success: true, count };
}

// ============================================
// Сводка
// ============================================

export async function getPayrollSummary(): Promise<PayrollSummary> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  const emptySummary: PayrollSummary = {
    period: null,
    employeesCount: 0,
    totalAccrued: 0,
    totalDeducted: 0,
    totalToPay: 0,
    totalNdfl: 0,
    paidCount: 0,
    unpaidCount: 0,
  };

  if (!companyId) return emptySummary;

  // Текущий период
  const period = await getCurrentPeriod();

  // Количество сотрудников
  const { count: employeesCount } = await supabase
    .from("payroll_employees")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active");

  if (!period) {
    return {
      ...emptySummary,
      employeesCount: employeesCount || 0,
    };
  }

  // Статистика по расчётным листкам
  const { data: payslips } = await supabase
    .from("payroll_payslips")
    .select("status, total_accrued, total_deducted, to_pay, ndfl_amount")
    .eq("period_id", period.id);

  const stats = (payslips || []).reduce(
    (acc, ps) => ({
      totalAccrued: acc.totalAccrued + (ps.total_accrued || 0),
      totalDeducted: acc.totalDeducted + (ps.total_deducted || 0),
      totalToPay: acc.totalToPay + (ps.to_pay || 0),
      totalNdfl: acc.totalNdfl + (ps.ndfl_amount || 0),
      paidCount: acc.paidCount + (ps.status === "paid" ? 1 : 0),
      unpaidCount: acc.unpaidCount + (ps.status !== "paid" ? 1 : 0),
    }),
    {
      totalAccrued: 0,
      totalDeducted: 0,
      totalToPay: 0,
      totalNdfl: 0,
      paidCount: 0,
      unpaidCount: 0,
    }
  );

  return {
    period,
    employeesCount: employeesCount || 0,
    ...stats,
  };
}
