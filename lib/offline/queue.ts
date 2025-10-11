/**
 * Офлайн очередь операций
 * Сохраняет операции в IndexedDB когда нет интернета
 * Синхронизирует их когда интернет появляется
 */

const DB_NAME = "finapp_offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_operations";

export interface PendingOperation {
  id: string;
  type: "create" | "update" | "delete";
  entity: "transactions" | "budgets" | "categories" | "plans";
  data: unknown;
  timestamp: number;
  attempts: number;
  lastError?: string;
}

class OfflineQueue {
  private db: IDBDatabase | null = null;

  /**
   * Инициализация IndexedDB
   */
  async init(): Promise<void> {
    if (typeof window === "undefined") return; // Только в браузере

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Создаём object store если его нет
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("entity", "entity", { unique: false });
        }
      };
    });
  }

  /**
   * Добавить операцию в очередь
   */
  async add(operation: Omit<PendingOperation, "id" | "timestamp" | "attempts">): Promise<string> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const id = crypto.randomUUID();
    const fullOperation: PendingOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      attempts: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(fullOperation);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Получить все операции из очереди
   */
  async getAll(): Promise<PendingOperation[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Удалить операцию из очереди
   */
  async remove(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Обновить операцию (увеличить счётчик попыток, записать ошибку)
   */
  async update(id: string, updates: Partial<PendingOperation>): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (!operation) {
          reject(new Error("Operation not found"));
          return;
        }

        const updated = { ...operation, ...updates };
        const putRequest = store.put(updated);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Очистить всю очередь
   */
  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Получить количество операций в очереди
   */
  async count(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();
