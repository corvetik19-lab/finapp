"use client";

import { useState, useEffect } from "react";
import styles from "./Backup.module.css";

interface Backup {
  name: string;
  path: string;
  size: number;
  created_at: string;
}

export default function BackupClient() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  async function loadBackups() {
    try {
      const res = await fetch("/api/backup");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch {
      alert("Ошибка при создании backup");
    } finally {
      setLoading(false);
    }
  }

  async function createBackup(downloadLocally = false) {
    setCreating(true);
    setMessage(null);

    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadToStorage: true,
          downloadLocally,
        }),
      });

      if (!res.ok) throw new Error("Failed to create backup");

      const data = await res.json();

      if (downloadLocally && data.backup) {
        // Скачиваем JSON файл
        const blob = new Blob([JSON.stringify(data.backup, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `finapp-backup-${new Date().toISOString()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }

      setMessage({ type: "success", text: "Резервная копия создана успешно!" });
      loadBackups();
    } catch {
      setMessage({
        type: "error",
        text: "Не удалось создать резервную копию",
      });
    } finally {
      setCreating(false);
    }
  }

  async function restoreBackup(path: string) {
    if (!confirm("Вы уверены? Это восстановит данные из выбранной резервной копии.")) {
      return;
    }

    setRestoring(true);
    setMessage(null);

    try {
      const res = await fetch("/api/backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          clearExisting: false, // Не удаляем существующие данные, просто добавляем
        }),
      });

      if (!res.ok) throw new Error("Failed to restore backup");

      const data = await res.json();

      setMessage({
        type: "success",
        text: `Восстановлено: ${data.imported.transactions} транзакций, ${data.imported.accounts} счетов`,
      });
    } catch {
      setMessage({ type: "error", text: "Ошибка восстановления" });
    } finally {
      setRestoring(false);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>💾 Резервное копирование</h1>
        <p className={styles.subtitle}>
          Создавайте резервные копии и восстанавливайте данные
        </p>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.type === "success" ? "✅" : "❌"} {message.text}
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.createBtn}
          onClick={() => createBackup(false)}
          disabled={creating}
        >
          {creating ? "Создаём..." : "📦 Создать резервную копию"}
        </button>
        <button
          className={styles.downloadBtn}
          onClick={() => createBackup(true)}
          disabled={creating}
        >
          {creating ? "Создаём..." : "⬇️ Создать и скачать"}
        </button>
      </div>

      <div className={styles.info}>
        <h3>ℹ️ Информация</h3>
        <ul>
          <li>Резервные копии создаются автоматически каждое воскресенье в 02:00</li>
          <li>Хранятся последние 5 копий</li>
          <li>Включают: счета, категории, транзакции, бюджеты, планы</li>
          <li>Восстановление не удаляет текущие данные</li>
        </ul>
      </div>

      <div className={styles.backupsList}>
        <h2>Доступные резервные копии</h2>

        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : backups.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📦</div>
            <p>Резервных копий пока нет</p>
            <p className={styles.emptyHint}>Создайте первую копию нажав кнопку выше</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {backups.map((backup) => (
              <div key={backup.path} className={styles.backupCard}>
                <div className={styles.backupHeader}>
                  <div className={styles.backupIcon}>💾</div>
                  <div className={styles.backupInfo}>
                    <div className={styles.backupName}>{backup.name}</div>
                    <div className={styles.backupMeta}>
                      {formatDate(backup.created_at)} • {formatSize(backup.size)}
                    </div>
                  </div>
                </div>
                <button
                  className={styles.restoreBtn}
                  onClick={() => restoreBackup(backup.path)}
                  disabled={restoring}
                >
                  {restoring ? "Восстанавливаем..." : "🔄 Восстановить"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
