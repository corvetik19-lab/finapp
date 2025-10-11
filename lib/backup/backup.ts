/**
 * Резервное копирование данных пользователя
 */
import { SupabaseClient } from "@supabase/supabase-js";

export interface BackupData {
  version: string;
  created_at: string;
  user_id: string;
  user_email: string;
  data: {
    accounts: Record<string, unknown>[];
    categories: Record<string, unknown>[];
    transactions: Record<string, unknown>[];
    budgets: Record<string, unknown>[];
    plans: Record<string, unknown>[];
    plan_topups: Record<string, unknown>[];
    upcoming_payments: Record<string, unknown>[];
    notes: Record<string, unknown>[];
    prompts: Record<string, unknown>[];
    settings: Record<string, unknown>;
  };
  metadata: {
    total_accounts: number;
    total_transactions: number;
    total_categories: number;
    date_range: {
      earliest_transaction: string | null;
      latest_transaction: string | null;
    };
  };
}

/**
 * Создание резервной копии всех данных пользователя
 */
export async function createBackup(
  supabase: SupabaseClient,
  userId: string
): Promise<BackupData> {
  // Получаем email пользователя
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Получаем все данные пользователя
  const [
    accountsRes,
    categoriesRes,
    transactionsRes,
    budgetsRes,
    plansRes,
    planTopupsRes,
    paymentsRes,
    notesRes,
    promptsRes,
  ] = await Promise.all([
    supabase.from("accounts").select("*").eq("user_id", userId),
    supabase.from("categories").select("*").eq("user_id", userId),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false }),
    supabase.from("budgets").select("*").eq("user_id", userId),
    supabase.from("plans").select("*").eq("user_id", userId),
    supabase.from("plan_topups").select("*").eq("user_id", userId),
    supabase.from("upcoming_payments").select("*").eq("user_id", userId),
    supabase.from("notes").select("*").eq("user_id", userId),
    supabase.from("prompts").select("*").eq("user_id", userId),
  ]);

  const transactions = transactionsRes.data || [];
  const accounts = accountsRes.data || [];
  const categories = categoriesRes.data || [];

  // Метаданные
  const earliestTransaction =
    transactions.length > 0
      ? transactions[transactions.length - 1].date
      : null;
  const latestTransaction =
    transactions.length > 0 ? transactions[0].date : null;

  const backup: BackupData = {
    version: "1.0.0",
    created_at: new Date().toISOString(),
    user_id: userId,
    user_email: user?.email || "",
    data: {
      accounts,
      categories,
      transactions,
      budgets: budgetsRes.data || [],
      plans: plansRes.data || [],
      plan_topups: planTopupsRes.data || [],
      upcoming_payments: paymentsRes.data || [],
      notes: notesRes.data || [],
      prompts: promptsRes.data || [],
      settings: {}, // TODO: добавить настройки если есть
    },
    metadata: {
      total_accounts: accounts.length,
      total_transactions: transactions.length,
      total_categories: categories.length,
      date_range: {
        earliest_transaction: earliestTransaction,
        latest_transaction: latestTransaction,
      },
    },
  };

  return backup;
}

/**
 * Восстановление данных из резервной копии
 */
export async function restoreFromBackup(
  supabase: SupabaseClient,
  userId: string,
  backup: BackupData,
  options: {
    clearExisting?: boolean;
    skipDuplicates?: boolean;
  } = {}
): Promise<{
  success: boolean;
  imported: {
    accounts: number;
    categories: number;
    transactions: number;
    budgets: number;
    plans: number;
  };
  errors: string[];
}> {
  const { clearExisting = false, skipDuplicates = true } = options;
  const errors: string[] = [];
  const imported = {
    accounts: 0,
    categories: 0,
    transactions: 0,
    budgets: 0,
    plans: 0,
  };

  try {
    // Если нужно очистить существующие данные
    if (clearExisting) {
      await Promise.all([
        supabase.from("transactions").delete().eq("user_id", userId),
        supabase.from("budgets").delete().eq("user_id", userId),
        supabase.from("plans").delete().eq("user_id", userId),
        supabase.from("plan_topups").delete().eq("user_id", userId),
        supabase.from("upcoming_payments").delete().eq("user_id", userId),
        supabase.from("notes").delete().eq("user_id", userId),
        supabase.from("prompts").delete().eq("user_id", userId),
        // Не удаляем accounts и categories, они могут быть связаны
      ]);
    }

    // Восстанавливаем счета
    if (backup.data.accounts.length > 0) {
      const accountsToInsert = backup.data.accounts.map((acc) => ({
        ...acc,
        user_id: userId, // Переписываем user_id на текущего пользователя
      }));

      const { error: accError } = await supabase
        .from("accounts")
        .upsert(accountsToInsert, { onConflict: "id" });

      if (accError && !skipDuplicates) {
        errors.push(`Accounts: ${accError.message}`);
      } else {
        imported.accounts = accountsToInsert.length;
      }
    }

    // Восстанавливаем категории
    if (backup.data.categories.length > 0) {
      const categoriesToInsert = backup.data.categories.map((cat) => ({
        ...cat,
        user_id: userId,
      }));

      const { error: catError } = await supabase
        .from("categories")
        .upsert(categoriesToInsert, { onConflict: "id" });

      if (catError && !skipDuplicates) {
        errors.push(`Categories: ${catError.message}`);
      } else {
        imported.categories = categoriesToInsert.length;
      }
    }

    // Восстанавливаем транзакции
    if (backup.data.transactions.length > 0) {
      const transactionsToInsert = backup.data.transactions.map((tx) => ({
        ...tx,
        user_id: userId,
      }));

      const { error: txError } = await supabase
        .from("transactions")
        .upsert(transactionsToInsert, { onConflict: "id" });

      if (txError && !skipDuplicates) {
        errors.push(`Transactions: ${txError.message}`);
      } else {
        imported.transactions = transactionsToInsert.length;
      }
    }

    // Восстанавливаем бюджеты
    if (backup.data.budgets.length > 0) {
      const budgetsToInsert = backup.data.budgets.map((b) => ({
        ...b,
        user_id: userId,
      }));

      const { error: budgetError } = await supabase
        .from("budgets")
        .upsert(budgetsToInsert, { onConflict: "id" });

      if (budgetError && !skipDuplicates) {
        errors.push(`Budgets: ${budgetError.message}`);
      } else {
        imported.budgets = budgetsToInsert.length;
      }
    }

    // Восстанавливаем планы
    if (backup.data.plans.length > 0) {
      const plansToInsert = backup.data.plans.map((p) => ({
        ...p,
        user_id: userId,
      }));

      const { error: planError } = await supabase
        .from("plans")
        .upsert(plansToInsert, { onConflict: "id" });

      if (planError && !skipDuplicates) {
        errors.push(`Plans: ${planError.message}`);
      } else {
        imported.plans = plansToInsert.length;
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      imported,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Загрузка backup в Supabase Storage
 */
export async function uploadBackupToStorage(
  supabase: SupabaseClient,
  userId: string,
  backup: BackupData
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const path = `${userId}/${filename}`;

    const { error } = await supabase.storage
      .from("backups")
      .upload(path, JSON.stringify(backup, null, 2), {
        contentType: "application/json",
        upsert: false,
      });

    if (error) throw error;

    return { success: true, path };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Получение списка backup'ов из Storage
 */
export async function listBackups(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  success: boolean;
  backups?: Array<{
    name: string;
    path: string;
    size: number;
    created_at: string;
  }>;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.storage
      .from("backups")
      .list(userId, {
        limit: 10,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) throw error;

    return {
      success: true,
      backups:
        data?.map((file: { name: string; created_at?: string; metadata?: { size?: number } }) => ({
          name: file.name,
          path: `${userId}/${file.name}`,
          size: file.metadata?.size || 0,
          created_at: file.created_at || new Date().toISOString(),
        })) || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "List failed",
    };
  }
}

/**
 * Скачивание backup из Storage
 */
export async function downloadBackupFromStorage(
  supabase: SupabaseClient,
  path: string
): Promise<{ success: boolean; backup?: BackupData; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from("backups")
      .download(path);

    if (error) throw error;

    const text = await data.text();
    const backup: BackupData = JSON.parse(text);

    return { success: true, backup };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Download failed",
    };
  }
}

/**
 * Удаление старых backup'ов (оставляем последние N)
 */
export async function cleanOldBackups(
  supabase: SupabaseClient,
  userId: string,
  keepLast: number = 5
): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from("backups")
      .list(userId, {
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) throw error;

    const toDelete = (data || []).slice(keepLast);

    if (toDelete.length === 0) {
      return { success: true, deleted: 0 };
    }

    const paths = toDelete.map((file: { name: string }) => `${userId}/${file.name}`);

    const { error: deleteError } = await supabase.storage
      .from("backups")
      .remove(paths);

    if (deleteError) throw deleteError;

    return { success: true, deleted: paths.length };
  } catch (error) {
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : "Clean failed",
    };
  }
}
