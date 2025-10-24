"use client";

import { useState, useEffect } from "react";
import styles from "./webhooks.module.css";

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
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Webhooks</h1>
          <p>Получайте уведомления о событиях в реальном времени</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>
          + Добавить Webhook
        </button>
      </div>

      {showForm && (
        <div className={styles.modal} onClick={resetForm}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>{editingId ? "Редактировать Webhook" : "Новый Webhook"}</h2>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Название</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Мой сервер"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="https://example.com/webhook"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>События (выберите хотя бы одно)</label>
                <div className={styles.eventsList}>
                  {AVAILABLE_EVENTS.map((event) => (
                    <label key={event.value} className={styles.eventItem}>
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event.value)}
                        onChange={() => toggleEvent(event.value)}
                      />
                      <span>
                        {event.icon} {event.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Повторы при ошибке</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={formData.retry_count}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        retry_count: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Таймаут (сек)</label>
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={formData.timeout_seconds}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timeout_seconds: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={resetForm}>
                  Отмена
                </button>
                <button type="submit" className={styles.primary}>
                  {editingId ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.webhooksList}>
        {webhooks.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔗</div>
            <h3>Нет webhooks</h3>
            <p>Создайте первый webhook для получения уведомлений</p>
          </div>
        ) : (
          webhooks.map((webhook) => (
            <div key={webhook.id} className={styles.webhookCard}>
              <div className={styles.webhookHeader}>
                <div>
                  <h3>{webhook.name}</h3>
                  <p className={styles.url}>{webhook.url}</p>
                </div>
                <div className={styles.statusBadge}>
                  {webhook.is_active ? (
                    <span className={styles.active}>Активен</span>
                  ) : (
                    <span className={styles.inactive}>Неактивен</span>
                  )}
                </div>
              </div>

              <div className={styles.webhookEvents}>
                {webhook.events.map((event) => {
                  const eventInfo = AVAILABLE_EVENTS.find(
                    (e) => e.value === event
                  );
                  return (
                    <span key={event} className={styles.eventBadge}>
                      {eventInfo?.icon} {eventInfo?.label || event}
                    </span>
                  );
                })}
              </div>

              {webhook.stats && (
                <div className={styles.stats}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Всего вызовов</span>
                    <span className={styles.statValue}>
                      {webhook.stats.total_calls}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Успешных</span>
                    <span className={styles.statValue}>
                      {webhook.stats.successful_calls}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Success Rate</span>
                    <span className={styles.statValue}>
                      {webhook.stats.success_rate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              <div className={styles.webhookActions}>
                <button
                  onClick={() => handleTest(webhook.id)}
                  disabled={testingId === webhook.id}
                >
                  {testingId === webhook.id ? "Отправка..." : "🧪 Тест"}
                </button>
                <button onClick={() => handleEdit(webhook)}>✏️ Изменить</button>
                <button
                  onClick={() => handleDelete(webhook.id)}
                  className={styles.danger}
                >
                  🗑️ Удалить
                </button>
              </div>

              {testResult && testingId === null && (
                <div
                  className={`${styles.testResult} ${
                    testResult.success ? styles.success : styles.error
                  }`}
                >
                  {testResult.success ? "✅" : "❌"} {testResult.message}
                  {testResult.error && <p>Ошибка: {testResult.error}</p>}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
