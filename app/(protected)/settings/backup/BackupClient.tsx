"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HardDrive, Download, RefreshCw, Trash2, Loader2, Package } from "lucide-react";

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
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><HardDrive className="h-6 w-6" />Резервное копирование</h1><p className="text-muted-foreground">Создавайте копии и восстанавливайте данные</p></div>

      {message && <Alert variant={message.type === "error" ? "destructive" : "default"}><AlertDescription>{message.text}</AlertDescription></Alert>}

      <div className="flex gap-3">
        <Button onClick={() => createBackup(false)} disabled={creating}>{creating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Создаём...</> : <><Package className="h-4 w-4 mr-1" />Создать копию</>}</Button>
        <Button variant="outline" onClick={() => createBackup(true)} disabled={creating}>{creating ? "Создаём..." : <><Download className="h-4 w-4 mr-1" />Создать и скачать</>}</Button>
      </div>

      <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Автоматические копии каждое воскресенье в 02:00. Хранятся 5 последних. Включают: счета, категории, транзакции, бюджеты, планы.</p></CardContent></Card>

      <Card>
        <CardHeader><CardTitle>Доступные копии</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8"><Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Копий пока нет</p></div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div key={backup.path} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3"><HardDrive className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium">{backup.name}</p><p className="text-sm text-muted-foreground">{formatDate(backup.created_at)} • {formatSize(backup.size)}</p></div></div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => restoreBackup(backup.path)} disabled={restoring || deleting !== null}>{restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteBackup(backup.path, backup.name)} disabled={deleting !== null || restoring}>{deleting === backup.path ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
