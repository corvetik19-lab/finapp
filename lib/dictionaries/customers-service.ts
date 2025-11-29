"use server";

import { createRSCClient } from "@/lib/supabase/helpers";
import { getCurrentOrganization } from "@/lib/platform/organization";
import { Customer, CustomerInput, CustomerFilters } from "@/types/customer";

// Helper to get first element from possibly array (Supabase returns arrays for joins)
function getFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Получить список заказчиков с фильтрацией
 */
export async function getCustomers(filters?: CustomerFilters): Promise<Customer[]> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return [];
  }

  let query = supabase
    .from("customers")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name", { ascending: true });

  // Фильтр по активности
  if (filters?.is_active !== undefined && filters.is_active !== 'all') {
    query = query.eq("is_active", filters.is_active);
  }

  // Фильтр по типу заказчика
  if (filters?.customer_type && filters.customer_type !== 'all') {
    query = query.eq("customer_type", filters.customer_type);
  }

  // Фильтр по региону
  if (filters?.region) {
    query = query.ilike("region", `%${filters.region}%`);
  }

  // Поиск по названию, ИНН, контактному лицу
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,short_name.ilike.%${filters.search}%,inn.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }

  return data || [];
}

/**
 * Получить заказчика по ID
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return null;
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .single();

  if (error) {
    console.error("Error fetching customer:", error);
    return null;
  }

  return data;
}

/**
 * Создать заказчика
 */
export async function createCustomer(input: CustomerInput): Promise<{ success: boolean; data?: Customer; error?: string }> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return { success: false, error: "Организация не найдена" };
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      organization_id: organization.id,
      created_by: user?.id,
      name: input.name,
      short_name: input.short_name || null,
      inn: input.inn || null,
      kpp: input.kpp || null,
      ogrn: input.ogrn || null,
      legal_address: input.legal_address || null,
      actual_address: input.actual_address || null,
      region: input.region || null,
      contact_person: input.contact_person || null,
      phone: input.phone || null,
      email: input.email || null,
      website: input.website || null,
      customer_type: input.customer_type || 'government',
      notes: input.notes || null,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating customer:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Обновить заказчика
 */
export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<{ success: boolean; data?: Customer; error?: string }> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return { success: false, error: "Организация не найдена" };
  }

  const { data, error } = await supabase
    .from("customers")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", organization.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating customer:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Удалить заказчика
 */
export async function deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return { success: false, error: "Организация не найдена" };
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) {
    console.error("Error deleting customer:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Переключить активность заказчика
 */
export async function toggleCustomerActive(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return { success: false, error: "Организация не найдена" };
  }

  // Получаем текущее состояние
  const { data: current } = await supabase
    .from("customers")
    .select("is_active")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .single();

  if (!current) {
    return { success: false, error: "Заказчик не найден" };
  }

  // Переключаем
  const { error } = await supabase
    .from("customers")
    .update({ is_active: !current.is_active })
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) {
    console.error("Error toggling customer active:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Получить статистику по заказчикам
 */
export async function getCustomersStats(): Promise<{
  total: number;
  active: number;
  byType: Record<string, number>;
}> {
  const supabase = await createRSCClient();
  const organization = await getCurrentOrganization();

  if (!organization) {
    return { total: 0, active: 0, byType: {} };
  }

  const { data, error } = await supabase
    .from("customers")
    .select("id, is_active, customer_type")
    .eq("organization_id", organization.id);

  if (error || !data) {
    return { total: 0, active: 0, byType: {} };
  }

  const byType: Record<string, number> = {};
  let active = 0;

  data.forEach((c) => {
    if (c.is_active) active++;
    byType[c.customer_type] = (byType[c.customer_type] || 0) + 1;
  });

  return {
    total: data.length,
    active,
    byType,
  };
}

/**
 * Получить тендеры связанные с заказчиком
 */
export async function getCustomerTenders(customerId: string): Promise<{
  id: string;
  purchase_number: string;
  subject: string;
  nmck: number;
  status: string;
  stage_name: string;
  manager_name: string | null;
  executor_name: string | null;
}[]> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from("tenders")
    .select(`
      id,
      purchase_number,
      subject,
      nmck,
      status,
      tender_stages!inner(name),
      manager:profiles!tenders_manager_id_fkey(full_name),
      executor:profiles!tenders_executor_id_fkey(full_name)
    `)
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching customer tenders:", error);
    return [];
  }

  return (data || []).map((t) => {
    const stage = getFirst(t.tender_stages);
    const manager = getFirst(t.manager);
    const executor = getFirst(t.executor);
    return {
      id: t.id,
      purchase_number: t.purchase_number,
      subject: t.subject,
      nmck: t.nmck,
      status: t.status,
      stage_name: stage?.name || '',
      manager_name: manager?.full_name || null,
      executor_name: executor?.full_name || null,
    };
  });
}

/**
 * Получить сотрудников работающих с заказчиком
 */
export async function getCustomerEmployees(customerId: string): Promise<{
  id: string;
  full_name: string;
  role: string;
  tenders_count: number;
}[]> {
  const supabase = await createRSCClient();
  
  // Получаем уникальных сотрудников из тендеров этого заказчика
  const { data: tenders, error } = await supabase
    .from("tenders")
    .select(`
      manager_id,
      specialist_id,
      executor_id,
      manager:profiles!tenders_manager_id_fkey(id, full_name),
      specialist:profiles!tenders_specialist_id_fkey(id, full_name),
      executor:profiles!tenders_executor_id_fkey(id, full_name)
    `)
    .eq("customer_id", customerId)
    .is("deleted_at", null);

  if (error || !tenders) {
    return [];
  }

  // Собираем уникальных сотрудников
  const employeesMap = new Map<string, { id: string; full_name: string; roles: Set<string>; count: number }>();

  tenders.forEach((t) => {
    const manager = getFirst(t.manager);
    const specialist = getFirst(t.specialist);
    const executor = getFirst(t.executor);
    
    if (manager?.id) {
      const emp = employeesMap.get(manager.id) || { id: manager.id, full_name: manager.full_name, roles: new Set(), count: 0 };
      emp.roles.add('Менеджер');
      emp.count++;
      employeesMap.set(manager.id, emp);
    }
    if (specialist?.id) {
      const emp = employeesMap.get(specialist.id) || { id: specialist.id, full_name: specialist.full_name, roles: new Set(), count: 0 };
      emp.roles.add('Специалист');
      emp.count++;
      employeesMap.set(specialist.id, emp);
    }
    if (executor?.id) {
      const emp = employeesMap.get(executor.id) || { id: executor.id, full_name: executor.full_name, roles: new Set(), count: 0 };
      emp.roles.add('Исполнитель');
      emp.count++;
      employeesMap.set(executor.id, emp);
    }
  });

  return Array.from(employeesMap.values()).map(emp => ({
    id: emp.id,
    full_name: emp.full_name || 'Без имени',
    role: Array.from(emp.roles).join(', '),
    tenders_count: emp.count,
  }));
}
