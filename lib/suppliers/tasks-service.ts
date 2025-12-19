"use server";

import { createRSCClient, getCachedUser } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import {
  SupplierTask,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
} from "./types";

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await getCachedUser();
  return user?.id || null;
}

// =====================================================
// CRUD операции для задач
// =====================================================

// Получить задачи по поставщику
export async function getSupplierTasks(
  supplierId: string
): Promise<SupplierTask[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("supplier_tasks")
    .select(`
      *,
      supplier:suppliers(id, name)
    `)
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching supplier tasks:", error);
    return [];
  }

  return (data || []) as SupplierTask[];
}

// Получить все задачи компании
export async function getAllTasks(options?: {
  status?: TaskStatus;
  assignedTo?: string;
  dueBefore?: string;
  supplierId?: string;
}): Promise<SupplierTask[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("supplier_tasks")
    .select(`
      *,
      supplier:suppliers(id, name)
    `)
    .eq("company_id", companyId);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.assignedTo) {
    query = query.eq("assigned_to", options.assignedTo);
  }

  if (options?.dueBefore) {
    query = query.lte("due_date", options.dueBefore);
  }

  if (options?.supplierId) {
    query = query.eq("supplier_id", options.supplierId);
  }

  const { data, error } = await query
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false });

  if (error) {
    logger.error("Error fetching tasks:", error);
    return [];
  }

  return (data || []) as SupplierTask[];
}

// Получить задачи на сегодня
export async function getTodayTasks(): Promise<SupplierTask[]> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  return getAllTasks({
    dueBefore: today.toISOString(),
    status: "pending",
  });
}

// Получить просроченные задачи
export async function getOverdueTasks(): Promise<SupplierTask[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("supplier_tasks")
    .select(`
      *,
      supplier:suppliers(id, name)
    `)
    .eq("company_id", companyId)
    .in("status", ["pending", "in_progress"])
    .lt("due_date", now)
    .order("due_date", { ascending: true });

  if (error) {
    logger.error("Error fetching overdue tasks:", error);
    return [];
  }

  return (data || []) as SupplierTask[];
}

// Создать задачу
export async function createTask(
  input: CreateTaskInput
): Promise<{ success: boolean; task?: SupplierTask; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  const userId = await getCurrentUserId();

  if (!companyId || !userId) {
    return { success: false, error: "Не авторизован" };
  }

  const { data, error } = await supabase
    .from("supplier_tasks")
    .insert({
      company_id: companyId,
      supplier_id: input.supplier_id,
      title: input.title,
      description: input.description,
      task_type: input.task_type || "other",
      priority: input.priority || "medium",
      due_date: input.due_date,
      reminder_date: input.reminder_date,
      assigned_to: input.assigned_to || userId,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating task:", error);
    return { success: false, error: "Ошибка создания задачи" };
  }

  // Логируем активность
  await logActivity(input.supplier_id, "task_created", `Создана задача: ${input.title}`, {
    task_id: data.id,
  });

  return { success: true, task: data as SupplierTask };
}

// Обновить задачу
export async function updateTask(
  taskId: string,
  input: UpdateTaskInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  // Если статус меняется на completed, устанавливаем completed_at
  const updateData: Record<string, unknown> = { ...input };
  if (input.status === "completed") {
    updateData.completed_at = new Date().toISOString();
  }

  const { data: task, error } = await supabase
    .from("supplier_tasks")
    .update(updateData)
    .eq("id", taskId)
    .eq("company_id", companyId)
    .select("supplier_id, title")
    .single();

  if (error) {
    logger.error("Error updating task:", error);
    return { success: false, error: "Ошибка обновления задачи" };
  }

  // Логируем завершение задачи
  if (input.status === "completed" && task) {
    await logActivity(task.supplier_id, "task_completed", `Задача выполнена: ${task.title}`, {
      task_id: taskId,
    });
  }

  return { success: true };
}

// Удалить задачу
export async function deleteTask(
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase
    .from("supplier_tasks")
    .delete()
    .eq("id", taskId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error deleting task:", error);
    return { success: false, error: "Ошибка удаления задачи" };
  }

  return { success: true };
}

// Быстрое завершение задачи
export async function completeTask(
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  return updateTask(taskId, { status: "completed" });
}

// =====================================================
// Activity Log
// =====================================================

export async function logActivity(
  supplierId: string,
  activityType: string,
  title: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  const userId = await getCurrentUserId();

  if (!companyId || !userId) return;

  await supabase.from("supplier_activities").insert({
    company_id: companyId,
    supplier_id: supplierId,
    activity_type: activityType,
    title,
    metadata: metadata || {},
    user_id: userId,
  });
}

// Получить историю активности
export async function getSupplierActivities(
  supplierId: string,
  limit = 50
): Promise<SupplierActivity[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("supplier_activities")
    .select("*")
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Error fetching activities:", error);
    return [];
  }

  return (data || []) as SupplierActivity[];
}

// Добавить комментарий
export async function addComment(
  supplierId: string,
  comment: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  const userId = await getCurrentUserId();

  if (!companyId || !userId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase.from("supplier_activities").insert({
    company_id: companyId,
    supplier_id: supplierId,
    activity_type: "comment",
    title: "Комментарий",
    description: comment,
    user_id: userId,
  });

  if (error) {
    logger.error("Error adding comment:", error);
    return { success: false, error: "Ошибка добавления комментария" };
  }

  return { success: true };
}

// Импорт типа для активности
import { SupplierActivity } from "./types";
import { logger } from "@/lib/logger";
