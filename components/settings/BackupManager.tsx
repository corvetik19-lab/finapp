"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Download, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [deleting, setDeleting] = useState<string | null>(null);
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

  async function deleteBackup(path: string, name: string) {
    if (!confirm(`Удалить резервную копию "${name}"?\n\nЭто действие нельзя отменить.`)) {
      return;
    }

    setDeleting(path);
    setMessage(null);

    try {
      const res = await fetch(`/api/backup?path=${encodeURIComponent(path)}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete backup");

      setMessage({
        type: "success",
        text: "Резервная копия успешно удалена",
      });
      loadBackups();
    } catch {
      setMessage({ type: "error", text: "Ошибка удаления" });
    } finally {
      setDeleting(null);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">💾 Резервное копирование</h1>
        <p className="text-muted-foreground">
          Создавайте резервные копии и восстанавливайте данные
        </p>
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-lg border",
          message.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
        )}>
          {message.type === "success" ? "✅" : "❌"} {message.text}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={() => createBackup(false)} disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {creating ? "Создаём..." : "📦 Создать резервную копию"}
        </Button>
        <Button variant="outline" onClick={() => createBackup(true)} disabled={creating}>
          <Download className="h-4 w-4 mr-2" />
          {creating ? "Создаём..." : "Создать и скачать"}
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">ℹ️ Информация</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Резервные копии создаются автоматически каждое воскресенье в 02:00</li>
          <li>• Хранятся последние 5 копий</li>
          <li>• Включают: счета, категории, транзакции, бюджеты, планы</li>
          <li>• Восстановление не удаляет текущие данные</li>
        </ul>
      </div>

      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">Доступные резервные копии</h2>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Загрузка...
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="text-4xl mb-4">📦</div>
            <p className="font-medium">Резервных копий пока нет</p>
            <p className="text-sm text-muted-foreground">Создайте первую копию нажав кнопку выше</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {backups.map((backup) => (
              <div key={backup.path} className="bg-muted/50 rounded-lg border p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-2xl">💾</div>
                  <div className="flex-1">
                    <div className="font-medium">{backup.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(backup.created_at)} • {formatSize(backup.size)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreBackup(backup.path)}
                    disabled={restoring || deleting !== null}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {restoring ? "Восстанавливаем..." : "Восстановить"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteBackup(backup.path, backup.name)}
                    disabled={deleting !== null || restoring}
                    className="text-destructive"
                  >
                    {deleting === backup.path ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
