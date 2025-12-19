"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { Supplier } from "./types";
import { logger } from "@/lib/logger";

export interface DuplicateGroup {
  key: string;
  reason: "inn" | "name" | "phone" | "email";
  suppliers: Supplier[];
}

export interface MergeResult {
  success: boolean;
  targetId?: string;
  mergedCount?: number;
  error?: string;
}

// Найти потенциальные дубликаты
export async function findDuplicates(): Promise<DuplicateGroup[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  if (error || !suppliers) {
    logger.error("Error fetching suppliers for duplicates:", error);
    return [];
  }

  const duplicates: DuplicateGroup[] = [];

  // Группировка по ИНН
  const byInn = new Map<string, Supplier[]>();
  suppliers.forEach((s) => {
    if (s.inn && s.inn.trim()) {
      const key = s.inn.trim();
      if (!byInn.has(key)) byInn.set(key, []);
      byInn.get(key)!.push(s as Supplier);
    }
  });
  byInn.forEach((group, key) => {
    if (group.length > 1) {
      duplicates.push({ key, reason: "inn", suppliers: group });
    }
  });

  // Группировка по телефону (нормализованному)
  const byPhone = new Map<string, Supplier[]>();
  suppliers.forEach((s) => {
    if (s.phone) {
      const normalized = s.phone.replace(/\D/g, "").slice(-10);
      if (normalized.length === 10) {
        if (!byPhone.has(normalized)) byPhone.set(normalized, []);
        byPhone.get(normalized)!.push(s as Supplier);
      }
    }
  });
  byPhone.forEach((group, key) => {
    if (group.length > 1) {
      // Проверяем, что эта группа не совпадает с группой по ИНН
      const innKeys = group.map((s) => s.inn).filter(Boolean);
      const uniqueInns = new Set(innKeys);
      if (uniqueInns.size > 1 || innKeys.length === 0) {
        duplicates.push({ key: `+7***${key.slice(-4)}`, reason: "phone", suppliers: group });
      }
    }
  });

  // Группировка по email
  const byEmail = new Map<string, Supplier[]>();
  suppliers.forEach((s) => {
    if (s.email && s.email.trim()) {
      const key = s.email.trim().toLowerCase();
      if (!byEmail.has(key)) byEmail.set(key, []);
      byEmail.get(key)!.push(s as Supplier);
    }
  });
  byEmail.forEach((group, key) => {
    if (group.length > 1) {
      const innKeys = group.map((s) => s.inn).filter(Boolean);
      const uniqueInns = new Set(innKeys);
      if (uniqueInns.size > 1 || innKeys.length === 0) {
        duplicates.push({ key, reason: "email", suppliers: group });
      }
    }
  });

  // Группировка по похожим названиям (упрощённый алгоритм)
  const processedNames = new Set<string>();
  suppliers.forEach((s1) => {
    if (processedNames.has(s1.id)) return;

    const similar = suppliers.filter((s2) => {
      if (s1.id === s2.id) return false;
      return isSimilarName(s1.name, s2.name);
    });

    if (similar.length > 0) {
      const group = [s1 as Supplier, ...similar.map((s) => s as Supplier)];
      // Проверяем, что нет совпадения по ИНН
      const innKeys = group.map((s) => s.inn).filter(Boolean);
      const uniqueInns = new Set(innKeys);
      if (uniqueInns.size > 1 || innKeys.length === 0) {
        duplicates.push({
          key: s1.name,
          reason: "name",
          suppliers: group,
        });
        group.forEach((s) => processedNames.add(s.id));
      }
    }
  });

  return duplicates;
}

// Проверка похожести названий
function isSimilarName(name1: string, name2: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[«»"']/g, "")
      .replace(/ооо|ип|зао|оао|пао/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  // Точное совпадение после нормализации
  if (n1 === n2) return true;

  // Одно название содержит другое
  if (n1.length > 5 && n2.length > 5) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }

  // Расстояние Левенштейна для коротких названий
  if (n1.length < 20 && n2.length < 20) {
    const distance = levenshteinDistance(n1, n2);
    const maxLen = Math.max(n1.length, n2.length);
    if (distance / maxLen < 0.2) return true; // 80% похожести
  }

  return false;
}

// Расстояние Левенштейна
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

// Слияние поставщиков
export async function mergeSuppliers(
  targetId: string,
  sourceIds: string[]
): Promise<MergeResult> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  if (sourceIds.includes(targetId)) {
    return { success: false, error: "Целевой поставщик не может быть в списке источников" };
  }

  try {
    // Переносим контакты
    await supabase
      .from("supplier_contacts")
      .update({ supplier_id: targetId })
      .in("supplier_id", sourceIds)
      .eq("company_id", companyId);

    // Переносим заметки
    await supabase
      .from("supplier_notes")
      .update({ supplier_id: targetId })
      .in("supplier_id", sourceIds)
      .eq("company_id", companyId);

    // Переносим файлы
    await supabase
      .from("supplier_files")
      .update({ supplier_id: targetId })
      .in("supplier_id", sourceIds)
      .eq("company_id", companyId);

    // Переносим задачи
    await supabase
      .from("supplier_tasks")
      .update({ supplier_id: targetId })
      .in("supplier_id", sourceIds)
      .eq("company_id", companyId);

    // Переносим активности
    await supabase
      .from("supplier_activities")
      .update({ supplier_id: targetId })
      .in("supplier_id", sourceIds)
      .eq("company_id", companyId);

    // Переносим договоры
    await supabase
      .from("supplier_contracts")
      .update({ supplier_id: targetId })
      .in("supplier_id", sourceIds)
      .eq("company_id", companyId);

    // Переносим прайс-листы
    await supabase
      .from("supplier_pricelists")
      .update({ supplier_id: targetId })
      .in("supplier_id", sourceIds)
      .eq("company_id", companyId);

    // Переносим отзывы
    await supabase
      .from("supplier_reviews")
      .update({ supplier_id: targetId })
      .in("supplier_id", sourceIds)
      .eq("company_id", companyId);

    // Переносим email
    await supabase
      .from("supplier_emails")
      .update({ supplier_id: targetId })
      .in("supplier_id", sourceIds)
      .eq("company_id", companyId);

    // Удаляем дубликаты
    const { error: deleteError } = await supabase
      .from("suppliers")
      .delete()
      .in("id", sourceIds)
      .eq("company_id", companyId);

    if (deleteError) {
      logger.error("Error deleting duplicate suppliers:", deleteError);
      return { success: false, error: "Ошибка удаления дубликатов" };
    }

    return { success: true, targetId, mergedCount: sourceIds.length };
  } catch (error) {
    logger.error("Error merging suppliers:", error);
    return { success: false, error: "Ошибка слияния поставщиков" };
  }
}

// Получить статистику дубликатов
export async function getDuplicatesStats(): Promise<{
  totalGroups: number;
  byInn: number;
  byPhone: number;
  byEmail: number;
  byName: number;
}> {
  const duplicates = await findDuplicates();

  return {
    totalGroups: duplicates.length,
    byInn: duplicates.filter((d) => d.reason === "inn").length,
    byPhone: duplicates.filter((d) => d.reason === "phone").length,
    byEmail: duplicates.filter((d) => d.reason === "email").length,
    byName: duplicates.filter((d) => d.reason === "name").length,
  };
}
