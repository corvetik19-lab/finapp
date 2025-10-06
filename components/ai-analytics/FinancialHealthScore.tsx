"use client";

import styles from "./FinancialHealthScore.module.css";

export type FinancialHealthScoreProps = {
  score: number;
  change: number;
  status: "good" | "warning" | "poor";
};

const statusLabels = {
  good: "Хорошее финансовое здоровье",
  warning: "Требует внимания",
  poor: "Нужны улучшения",
};

export default function FinancialHealthScore({ score, change, status }: FinancialHealthScoreProps) {
  const isPositiveChange = change >= 0;
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <span className="material-icons" aria-hidden>
            psychology
          </span>
          Финансовое здоровье
        </div>
      </div>

      <div className={styles.scoreContainer}>
        <div className={styles.scoreCircle}>
          <svg className={styles.scoreSvg} viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              className={styles.scoreBg}
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              className={styles.scoreProgress}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: offset,
              }}
            />
          </svg>
          <div className={styles.scoreText}>
            <div className={styles.scoreValue}>{score}</div>
            <div className={styles.scoreLabel}>Баллов</div>
          </div>
        </div>

        <div className={styles.scoreDescription}>
          <div className={`${styles.scoreStatus} ${styles[`scoreStatus--${status}`]}`}>
            {statusLabels[status]}
          </div>
          <div className={`${styles.scoreTrend} ${isPositiveChange ? styles.scoreTrendPositive : styles.scoreTrendNegative}`}>
            <span className="material-icons" aria-hidden>
              {isPositiveChange ? "trending_up" : "trending_down"}
            </span>
            {isPositiveChange ? "+" : ""}{change} баллов за месяц
          </div>
        </div>
      </div>
    </div>
  );
}
