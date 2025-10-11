import { offlineQueue, PendingOperation } from "./queue";
import { getSupabaseClient } from "@/lib/supabase/client";

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
      console.log("[Sync] Internet connection restored, starting sync...");
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
      console.log("[Sync] Already syncing, skipping...");
      return { success: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      console.log("[Sync] Offline, skipping sync");
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    let successCount = 0;
    let failedCount = 0;

    try {
      const operations = await offlineQueue.getAll();

      if (operations.length === 0) {
        console.log("[Sync] No pending operations");
        return { success: 0, failed: 0 };
      }

      console.log(`[Sync] Syncing ${operations.length} operations...`);

      const supabase = getSupabaseClient();

      // Синхронизировать операции по очереди
      for (const operation of operations) {
        try {
          await this.syncOperation(supabase, operation);
          await offlineQueue.remove(operation.id);
          successCount++;
          console.log(`[Sync] ✅ Operation ${operation.id} synced successfully`);
        } catch (error) {
          failedCount++;
          const errorMessage = (error as Error).message;
          console.error(`[Sync] ❌ Failed to sync operation ${operation.id}:`, errorMessage);

          // Обновить операцию с информацией об ошибке
          await offlineQueue.update(operation.id, {
            attempts: operation.attempts + 1,
            lastError: errorMessage,
          });

          // Удалить операцию после 5 неудачных попыток
          if (operation.attempts >= 5) {
            console.error(`[Sync] ⛔ Operation ${operation.id} failed 5 times, removing from queue`);
            await offlineQueue.remove(operation.id);
          }
        }
      }

      console.log(`[Sync] Complete: ${successCount} success, ${failedCount} failed`);
      return { success: successCount, failed: failedCount };
    } catch (error) {
      console.error("[Sync] Sync error:", error);
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
