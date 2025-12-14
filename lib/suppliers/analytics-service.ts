"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  blacklistedSuppliers: number;
  avgRating: number;
  totalContracts: number;
  activeContracts: number;
  expiringContracts: number;
  pendingTasks: number;
  overdueTasks: number;
}

export interface TopSupplier {
  id: string;
  name: string;
  rating: number;
  contractsCount: number;
  tendersCount: number;
  category?: string;
}

export interface SuppliersByCategory {
  categoryId: string;
  categoryName: string;
  count: number;
  avgRating: number;
}

export interface SuppliersByStatus {
  status: string;
  count: number;
}

export interface MonthlyActivity {
  month: string;
  newSuppliers: number;
  tasksCreated: number;
  tasksCompleted: number;
  contractsSigned: number;
}

// Получить общую статистику
export async function getSupplierStats(): Promise<SupplierStats> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return {
      totalSuppliers: 0,
      activeSuppliers: 0,
      inactiveSuppliers: 0,
      blacklistedSuppliers: 0,
      avgRating: 0,
      totalContracts: 0,
      activeContracts: 0,
      expiringContracts: 0,
      pendingTasks: 0,
      overdueTasks: 0,
    };
  }

  // Статистика по поставщикам
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("status, rating")
    .eq("company_id", companyId)
    .is("deleted_at", null);

  const totalSuppliers = suppliers?.length || 0;
  const activeSuppliers = suppliers?.filter((s) => s.status === "active").length || 0;
  const inactiveSuppliers = suppliers?.filter((s) => s.status === "inactive").length || 0;
  const blacklistedSuppliers = suppliers?.filter((s) => s.status === "blacklisted").length || 0;
  const ratings = suppliers?.filter((s) => s.rating).map((s) => s.rating) || [];
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  // Статистика по договорам
  const { data: contracts } = await supabase
    .from("supplier_contracts")
    .select("status, end_date")
    .eq("company_id", companyId);

  const totalContracts = contracts?.length || 0;
  const activeContracts = contracts?.filter((c) => c.status === "active").length || 0;
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringContracts = contracts?.filter((c) => {
    if (c.status !== "active" || !c.end_date) return false;
    const endDate = new Date(c.end_date);
    return endDate <= thirtyDaysFromNow && endDate >= new Date();
  }).length || 0;

  // Статистика по задачам
  const { data: tasks } = await supabase
    .from("supplier_tasks")
    .select("status, due_date")
    .eq("company_id", companyId)
    .in("status", ["pending", "in_progress"]);

  const pendingTasks = tasks?.length || 0;
  const now = new Date();
  const overdueTasks = tasks?.filter((t) => t.due_date && new Date(t.due_date) < now).length || 0;

  return {
    totalSuppliers,
    activeSuppliers,
    inactiveSuppliers,
    blacklistedSuppliers,
    avgRating: Math.round(avgRating * 10) / 10,
    totalContracts,
    activeContracts,
    expiringContracts,
    pendingTasks,
    overdueTasks,
  };
}

// Топ поставщиков по рейтингу
export async function getTopSuppliers(limit = 10): Promise<TopSupplier[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select(`
      id, name, rating,
      category:supplier_categories(name)
    `)
    .eq("company_id", companyId)
    .eq("status", "active")
    .is("deleted_at", null)
    .not("rating", "is", null)
    .order("rating", { ascending: false })
    .limit(limit);

  if (!suppliers) return [];

  // Получаем количество договоров и тендеров для каждого поставщика
  const result = await Promise.all(
    suppliers.map(async (s) => {
      const [{ count: contractsCount }, { count: tendersCount }] = await Promise.all([
        supabase
          .from("supplier_contracts")
          .select("*", { count: "exact", head: true })
          .eq("supplier_id", s.id)
          .eq("status", "active"),
        supabase
          .from("supplier_tenders")
          .select("*", { count: "exact", head: true })
          .eq("supplier_id", s.id),
      ]);

      return {
        id: s.id,
        name: s.name,
        rating: s.rating || 0,
        contractsCount: contractsCount || 0,
        tendersCount: tendersCount || 0,
        category: s.category && typeof s.category === "object" && "name" in s.category
          ? (s.category as { name: string }).name
          : undefined,
      };
    })
  );

  return result;
}

// Распределение по категориям
export async function getSuppliersByCategory(): Promise<SuppliersByCategory[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data: categories } = await supabase
    .from("supplier_categories")
    .select("id, name")
    .eq("company_id", companyId);

  if (!categories) return [];

  const result = await Promise.all(
    categories.map(async (cat) => {
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("rating")
        .eq("company_id", companyId)
        .eq("category_id", cat.id)
        .is("deleted_at", null);

      const count = suppliers?.length || 0;
      const ratings = suppliers?.filter((s) => s.rating).map((s) => s.rating) || [];
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        count,
        avgRating: Math.round(avgRating * 10) / 10,
      };
    })
  );

  return result.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
}

// Распределение по статусам
export async function getSuppliersByStatus(): Promise<SuppliersByStatus[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("status")
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (!suppliers) return [];

  const statusCounts: Record<string, number> = {};
  suppliers.forEach((s) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });

  return Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
}

// Активность по месяцам (за последние 6 месяцев)
export async function getMonthlyActivity(): Promise<MonthlyActivity[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const months: MonthlyActivity[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const monthName = monthStart.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });

    const [
      { count: newSuppliers },
      { count: tasksCreated },
      { count: tasksCompleted },
      { count: contractsSigned },
    ] = await Promise.all([
      supabase
        .from("suppliers")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString()),
      supabase
        .from("supplier_tasks")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString()),
      supabase
        .from("supplier_tasks")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "completed")
        .gte("completed_at", monthStart.toISOString())
        .lte("completed_at", monthEnd.toISOString()),
      supabase
        .from("supplier_contracts")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString()),
    ]);

    months.push({
      month: monthName,
      newSuppliers: newSuppliers || 0,
      tasksCreated: tasksCreated || 0,
      tasksCompleted: tasksCompleted || 0,
      contractsSigned: contractsSigned || 0,
    });
  }

  return months;
}
