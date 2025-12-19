"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

interface UsageLog {
  id: string;
  feature: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost_estimate: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

const featureNames: Record<string, string> = {
  chat: "💬 Умный чат",
  image: "🖼️ Изображения",
  video: "🎬 Видео",
  audio: "🎤 Аудио",
  document: "📄 Документы",
  research: "🔬 Исследование",
};

const featureIcons: Record<string, string> = {
  chat: "chat",
  image: "image",
  video: "movie",
  audio: "mic",
  document: "description",
  research: "science",
};

export default function HistoryPage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
  });

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("ai_studio_usage_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const logsData = data || [];
      setLogs(logsData);

      // Подсчёт статистики
      const totalRequests = logsData.length;
      const totalInputTokens = logsData.reduce((sum, log) => sum + (log.tokens_input || 0), 0);
      const totalOutputTokens = logsData.reduce((sum, log) => sum + (log.tokens_output || 0), 0);
      const totalCost = logsData.reduce((sum, log) => sum + (log.cost_estimate || 0), 0);

      setStats({ totalRequests, totalInputTokens, totalOutputTokens, totalCost });
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatTokens(tokens: number) {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <span className="material-icons">hourglass_empty</span>
          Загрузка истории...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          <span className="material-icons">history</span>
          История использования
        </h1>
        <p>Статистика и история запросов к ИИ</p>
      </div>

      {/* Статистика */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <span className="material-icons">query_stats</span>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalRequests}</div>
            <div className={styles.statLabel}>Запросов</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <span className="material-icons">input</span>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{formatTokens(stats.totalInputTokens)}</div>
            <div className={styles.statLabel}>Входных токенов</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <span className="material-icons">output</span>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{formatTokens(stats.totalOutputTokens)}</div>
            <div className={styles.statLabel}>Выходных токенов</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <span className="material-icons">payments</span>
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>${stats.totalCost.toFixed(4)}</div>
            <div className={styles.statLabel}>Примерная стоимость</div>
          </div>
        </div>
      </div>

      {/* История */}
      <div className={styles.historySection}>
        <h2>Последние запросы</h2>
        
        {logs.length === 0 ? (
          <div className={styles.emptyState}>
            <span className="material-icons">inbox</span>
            <p>История пуста</p>
            <span>Начните использовать ИИ Студию, чтобы видеть историю запросов</span>
          </div>
        ) : (
          <div className={styles.logsList}>
            {logs.map((log) => (
              <div key={log.id} className={styles.logItem}>
                <div className={styles.logIcon}>
                  <span className="material-icons">
                    {featureIcons[log.feature] || "smart_toy"}
                  </span>
                </div>
                <div className={styles.logContent}>
                  <div className={styles.logHeader}>
                    <span className={styles.logFeature}>
                      {featureNames[log.feature] || log.feature}
                    </span>
                    <span className={styles.logModel}>{log.model}</span>
                  </div>
                  <div className={styles.logMeta}>
                    <span>
                      <span className="material-icons">schedule</span>
                      {formatDate(log.created_at)}
                    </span>
                    <span>
                      <span className="material-icons">token</span>
                      {log.tokens_input + log.tokens_output} токенов
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
