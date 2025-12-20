"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

interface KieTaskInput {
  prompt?: string;
  [key: string]: unknown;
}

interface KieTask {
  id: string;
  task_id: string;
  model: string;
  model_name: string;
  category: "image" | "video" | "audio";
  status: "waiting" | "queuing" | "generating" | "success" | "fail";
  input: KieTaskInput;
  result_urls: string[];
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

type CategoryFilter = "all" | "image" | "video" | "audio";
type StatusFilter = "all" | "waiting" | "queuing" | "generating" | "success" | "fail";

export default function KieHistoryPage() {
  const [tasks, setTasks] = useState<KieTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/kie/tasks?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка загрузки");
      }

      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const deleteTask = async (taskId: string) => {
    if (!confirm("Удалить эту задачу из истории?")) return;

    try {
      const response = await fetch(`/api/kie/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTasks(tasks.filter((t) => t.id !== taskId));
      }
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "image": return "🖼️";
      case "video": return "🎬";
      case "audio": return "🎵";
      default: return "✨";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "image": return "Изображение";
      case "video": return "Видео";
      case "audio": return "Аудио";
      default: return category;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "waiting": return "⏳";
      case "queuing": return "📋";
      case "generating": return "⚙️";
      case "success": return "✅";
      case "fail": return "❌";
      default: return "❓";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "waiting": return "Ожидание";
      case "queuing": return "В очереди";
      case "generating": return "Генерация";
      case "success": return "Готово";
      case "fail": return "Ошибка";
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/ai-studio/kie" className={styles.backLink}>
          ← Назад
        </Link>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>📜 История задач</h1>
          <p className={styles.subtitle}>Все ваши генерации Kie.ai</p>
        </div>
      </header>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Категория:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className={styles.select}
          >
            <option value="all">Все</option>
            <option value="image">🖼️ Изображения</option>
            <option value="video">🎬 Видео</option>
            <option value="audio">🎵 Аудио</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Статус:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={styles.select}
          >
            <option value="all">Все</option>
            <option value="success">✅ Готово</option>
            <option value="generating">⚙️ Генерация</option>
            <option value="fail">❌ Ошибка</option>
          </select>
        </div>

        <button onClick={loadTasks} className={styles.refreshBtn}>
          🔄 Обновить
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          ⏳
          <p>Загрузка истории...</p>
        </div>
      ) : error ? (
        <div className={styles.error}>
          ❌
          <p>{error}</p>
          <button onClick={loadTasks}>Попробовать снова</button>
        </div>
      ) : tasks.length === 0 ? (
        <div className={styles.empty}>
          📭
          <p>История пуста</p>
          <Link href="/ai-studio/kie" className={styles.linkBtn}>
            Создать первую генерацию
          </Link>
        </div>
      ) : (
        <div className={styles.taskList}>
          {tasks.map((task) => (
            <div key={task.id} className={styles.taskCard}>
              <div className={styles.taskHeader}>
                <span className={styles.taskCategory}>
                  {getCategoryIcon(task.category)} {getCategoryLabel(task.category)}
                </span>
                <span className={`${styles.taskStatus} ${styles[task.status]}`}>
                  {getStatusIcon(task.status)} {getStatusLabel(task.status)}
                </span>
              </div>

              <div className={styles.taskBody}>
                <h3 className={styles.taskModel}>{task.model_name}</h3>
                {task.input?.prompt && (
                  <p className={styles.taskPrompt}>
                    {String(task.input.prompt || "").slice(0, 150)}
                    {String(task.input.prompt || "").length > 150 ? "..." : ""}
                  </p>
                )}
              </div>

              {task.status === "success" && task.result_urls?.length > 0 && (
                <div className={styles.taskResults}>
                  {task.result_urls.slice(0, 4).map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.resultThumb}
                    >
                      {task.category === "image" ? (
                        <Image src={url} alt={`Result ${idx + 1}`} width={80} height={80} unoptimized />
                      ) : task.category === "video" ? (
                        <span>🎬</span>
                      ) : (
                        <span>🎵</span>
                      )}
                    </a>
                  ))}
                </div>
              )}

              {task.status === "fail" && task.error_message && (
                <p className={styles.taskError}>{task.error_message}</p>
              )}

              <div className={styles.taskFooter}>
                <span className={styles.taskDate}>
                  {formatDate(task.created_at)}
                </span>
                <div className={styles.taskActions}>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className={styles.deleteBtn}
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
