"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Pencil, Trash2, FlaskConical } from "lucide-react";

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  retry_count: number;
  timeout_seconds: number;
  created_at: string;
  stats?: {
    total_calls: number;
    successful_calls: number;
    success_rate: number;
  };
}

const AVAILABLE_EVENTS = [
  { value: "transaction.created", label: "Создана транзакция", icon: "➕" },
  { value: "transaction.updated", label: "Обновлена транзакция", icon: "✏️" },
  { value: "transaction.deleted", label: "Удалена транзакция", icon: "🗑️" },
  { value: "budget.exceeded", label: "Превышен бюджет", icon: "🚨" },
  { value: "budget.warning", label: "Предупреждение о бюджете", icon: "⚠️" },
  { value: "goal.achieved", label: "Достигнута цель", icon: "🎯" },
  { value: "achievement.unlocked", label: "Разблокировано достижение", icon: "🏆" },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    events: [] as string[],
    retry_count: 3,
    timeout_seconds: 10,
  });
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    status_code?: number;
    duration_ms?: number;
  } | null>(null);

  useEffect(() => {
    loadWebhooks();
  }, []);

  async function loadWebhooks() {
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) {
        const { webhooks: data } = await res.json();
        setWebhooks(data);
      }
    } catch (error) {
      console.error("Failed to load webhooks:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.url || formData.events.length === 0) {
      alert("Заполните все поля");
      return;
    }

    try {
      const url = editingId ? `/api/webhooks/${editingId}` : "/api/webhooks";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        await loadWebhooks();
        if (!editingId && data.secret) {
          // Показываем секрет только при создании
          alert(
            `Webhook создан! Сохраните секретный ключ:\n\n${data.secret}\n\nОн больше не будет показан.`
          );
        }
        resetForm();
      } else {
        const errorData = await res.json();
        alert(`Ошибка: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Failed to save webhook:", error);
      alert("Не удалось сохранить webhook");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить этот webhook?")) return;

    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadWebhooks();
      }
    } catch (error) {
      console.error("Failed to delete webhook:", error);
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    setTestResult(null);

    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "Network error" });
    } finally {
      setTestingId(null);
    }
  }

  function handleEdit(webhook: Webhook) {
    setEditingId(webhook.id);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      retry_count: webhook.retry_count,
      timeout_seconds: webhook.timeout_seconds,
    });
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: "",
      url: "",
      events: [],
      retry_count: 3,
      timeout_seconds: 10,
    });
  }

  function toggleEvent(event: string) {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">Получайте уведомления о событиях в реальном времени</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Добавить Webhook
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать Webhook" : "Новый Webhook"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Название</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Мой сервер"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">URL</label>
              <Input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com/webhook"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">События (выберите хотя бы одно)</label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <label key={event.value} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                    <Checkbox
                      checked={formData.events.includes(event.value)}
                      onCheckedChange={() => toggleEvent(event.value)}
                    />
                    <span className="text-sm">
                      {event.icon} {event.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Повторы при ошибке</label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  value={formData.retry_count}
                  onChange={(e) => setFormData({ ...formData, retry_count: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Таймаут (сек)</label>
                <Input
                  type="number"
                  min={5}
                  max={30}
                  value={formData.timeout_seconds}
                  onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Отмена
              </Button>
              <Button type="submit">
                {editingId ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {webhooks.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-lg font-semibold">Нет webhooks</h3>
            <p className="text-muted-foreground">Создайте первый webhook для получения уведомлений</p>
          </div>
        ) : (
          webhooks.map((webhook) => (
            <div key={webhook.id} className="bg-card rounded-lg border p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{webhook.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{webhook.url}</p>
                </div>
                <Badge variant={webhook.is_active ? "default" : "secondary"}>
                  {webhook.is_active ? "Активен" : "Неактивен"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {webhook.events.map((event) => {
                  const eventInfo = AVAILABLE_EVENTS.find((e) => e.value === event);
                  return (
                    <Badge key={event} variant="outline">
                      {eventInfo?.icon} {eventInfo?.label || event}
                    </Badge>
                  );
                })}
              </div>

              {webhook.stats && (
                <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Всего вызовов</div>
                    <div className="font-semibold">{webhook.stats.total_calls}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Успешных</div>
                    <div className="font-semibold">{webhook.stats.successful_calls}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                    <div className="font-semibold">{webhook.stats.success_rate.toFixed(1)}%</div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTest(webhook.id)}
                  disabled={testingId === webhook.id}
                >
                  {testingId === webhook.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <FlaskConical className="h-4 w-4 mr-1" />
                  )}
                  Тест
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleEdit(webhook)}>
                  <Pencil className="h-4 w-4 mr-1" /> Изменить
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(webhook.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Удалить
                </Button>
              </div>

              {testResult && testingId === null && (
                <div className={cn(
                  "p-3 rounded-lg text-sm",
                  testResult.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
                )}>
                  {testResult.success ? "✅" : "❌"} {testResult.message}
                  {testResult.error && <p className="mt-1">Ошибка: {testResult.error}</p>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
