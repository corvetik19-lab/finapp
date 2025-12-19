import { offlineQueue, PendingOperation } from "./queue";
import { getSupabaseClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Сервис синхронизации офлайн-операций
 */
class SyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * Начать автоматическую синхронизацию
   */
  startAutoSync(intervalMs = 30000) {
    if (typeof window === "undefined") return;

    // Синхронизировать при появлении интернета
    window.addEventListener("online", () => {
      logger.info("Internet connection restored, starting sync");
      this.sync();
    });

    // Периодическая синхронизация
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.sync();
      }
    }, intervalMs);

    // Первоначальная синхронизация
    if (navigator.onLine) {
      this.sync();
    }
  }

  /**
   * Остановить автоматическую синхронизацию
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Синхронизировать все операции из очереди
   */
  async sync(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      logger.debug("Already syncing, skipping");
      return { success: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      logger.debug("Offline, skipping sync");
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    try {
      const operations = await offlineQueue.getAll();

      if (operations.length === 0) {
        logger.debug("No pending operations");
        return { success: 0, failed: 0 };
      }

      // Устанавливаем флаг синхронизации только если есть операции
      this.isSyncing = true;

      logger.info("Syncing operations", { count: operations.length });

      const supabase = getSupabaseClient();

      // Синхронизировать операции по очереди
      for (const operation of operations) {
        try {
          await this.syncOperation(supabase, operation);
          await offlineQueue.remove(operation.id);
          successCount++;
          logger.debug("Operation synced successfully", { id: operation.id });
        } catch (error) {
          failedCount++;
          const errorMessage = (error as Error).message;
          logger.error("Failed to sync operation", { id: operation.id, error: errorMessage });

          // Обновить операцию с информацией об ошибке
          await offlineQueue.update(operation.id, {
            attempts: operation.attempts + 1,
            lastError: errorMessage,
          });

          // Удалить операцию после 5 неудачных попыток
          if (operation.attempts >= 5) {
            logger.error("Operation failed 5 times, removing from queue", { id: operation.id });
            await offlineQueue.remove(operation.id);
          }
        }
      }

      logger.info("Sync complete", { success: successCount, failed: failedCount });
      return { success: successCount, failed: failedCount };
    } catch (error) {
      logger.error("Sync error", { error });
      return { success: successCount, failed: failedCount };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Синхронизировать одну операцию
   */
  private async syncOperation(supabase: ReturnType<typeof getSupabaseClient>, operation: PendingOperation): Promise<void> {
    const { type, entity, data } = operation;

    switch (entity) {
      case "transactions":
        if (type === "create") {
          const { error } = await supabase.from("transactions").insert(data as Record<string, unknown>);
          if (error) throw error;
        } else if (type === "update") {
          const { id, ...updateData } = data as Record<string, unknown>;
          const { error } = await supabase.from("transactions").update(updateData).eq("id", id);
          if (error) throw error;
        } else if (type === "delete") {
          const { id } = data as { id: string };
          const { error } = await supabase.from("transactions").delete().eq("id", id);
          if (error) throw error;
        }
        break;

      case "budgets":
        if (type === "create") {
          const { error } = await supabase.from("budgets").insert(data as Record<string, unknown>);
          if (error) throw error;
        } else if (type === "update") {
          const { id, ...updateData } = data as Record<string, unknown>;
          const { error } = await supabase.from("budgets").update(updateData).eq("id", id);
          if (error) throw error;
        } else if (type === "delete") {
          const { id } = data as { id: string };
          const { error } = await supabase.from("budgets").delete().eq("id", id);
          if (error) throw error;
        }
        break;

      case "categories":
        if (type === "create") {
          const { error } = await supabase.from("categories").insert(data as Record<string, unknown>);
          if (error) throw error;
        } else if (type === "update") {
          const { id, ...updateData } = data as Record<string, unknown>;
          const { error } = await supabase.from("categories").update(updateData).eq("id", id);
          if (error) throw error;
        } else if (type === "delete") {
          const { id } = data as { id: string };
          const { error } = await supabase.from("categories").delete().eq("id", id);
          if (error) throw error;
        }
        break;

      case "plans":
        if (type === "create") {
          const { error } = await supabase.from("plans").insert(data as Record<string, unknown>);
          if (error) throw error;
        } else if (type === "update") {
          const { id, ...updateData } = data as Record<string, unknown>;
          const { error } = await supabase.from("plans").update(updateData).eq("id", id);
          if (error) throw error;
        } else if (type === "delete") {
          const { id } = data as { id: string };
          const { error } = await supabase.from("plans").delete().eq("id", id);
          if (error) throw error;
        }
        break;

      default:
        throw new Error(`Unsupported entity type: ${entity}`);
    }
  }

  /**
   * Получить статус синхронизации
   */
  async getStatus(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
  }> {
    return {
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      isSyncing: this.isSyncing,
      pendingCount: await offlineQueue.count(),
    };
  }
}

// Singleton instance
export const syncService = new SyncService();
