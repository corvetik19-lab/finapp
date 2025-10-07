"use client";

import styles from "./AnomaliesDetection.module.css";

type Anomaly = {
  id: string;
  type: "expense" | "income";
  category: string;
  amount: number;
  averageAmount: number;
  percentageChange: number;
  description: string;
  severity: "low" | "medium" | "high";
};

type Props = {
  anomalies: Anomaly[];
};

export default function AnomaliesDetection({ anomalies }: Props) {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <span className={styles.icon}>🔍</span>
            Детекция аномалий
          </h3>
        </div>
        <div className={styles.emptyState}>
          <span className={styles.checkIcon}>✅</span>
          <p>Необычных трат не обнаружено</p>
          <span className={styles.subtext}>AI постоянно мониторит ваши финансы</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.icon}>🔍</span>
          Обнаружены аномалии
        </h3>
        <span className={styles.badge}>
          {anomalies.length} {getAnomalyWord(anomalies.length)}
        </span>
      </div>

      <div className={styles.anomaliesList}>
        {anomalies.map((anomaly) => (
          <div 
            key={anomaly.id} 
            className={`${styles.anomalyCard} ${styles[`severity-${anomaly.severity}`]}`}
          >
            <div className={styles.anomalyHeader}>
              <div className={styles.anomalyIcon}>
                {getSeverityIcon(anomaly.severity)}
              </div>
              <div className={styles.anomalyTitle}>
                <h4>{anomaly.category}</h4>
                <span className={styles.anomalyType}>
                  {anomaly.type === "expense" ? "Расход" : "Доход"}
                </span>
              </div>
              <div className={styles.changePercentage}>
                <span className={styles.changeValue}>
                  {anomaly.percentageChange > 0 ? "+" : ""}
                  {anomaly.percentageChange.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className={styles.anomalyBody}>
              <p className={styles.description}>{anomaly.description}</p>
              
              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Текущая сумма:</span>
                  <span className={styles.statValue}>
                    {anomaly.amount.toLocaleString('ru-RU')}₽
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Средняя сумма:</span>
                  <span className={styles.statValue}>
                    {anomaly.averageAmount.toLocaleString('ru-RU')}₽
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.anomalyFooter}>
              <span className={`${styles.severityBadge} ${styles[`badge-${anomaly.severity}`]}`}>
                {getSeverityText(anomaly.severity)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case "high":
      return "🚨";
    case "medium":
      return "⚠️";
    case "low":
      return "ℹ️";
    default:
      return "📊";
  }
}

function getSeverityText(severity: string): string {
  switch (severity) {
    case "high":
      return "Высокая важность";
    case "medium":
      return "Средняя важность";
    case "low":
      return "Низкая важность";
    default:
      return "Информация";
  }
}

function getAnomalyWord(count: number): string {
  if (count === 1) return "аномалия";
  if (count >= 2 && count <= 4) return "аномалии";
  return "аномалий";
}
