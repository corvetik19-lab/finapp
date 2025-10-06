import styles from "./AIInsights.module.css";

export type Insight = {
  id: string;
  type: "positive" | "warning" | "info";
  title: string;
  text: string;
};

export type AIInsightsProps = {
  insights: Insight[];
};

const insightIcons = {
  positive: "lightbulb",
  warning: "warning",
  info: "trending_up",
};

export default function AIInsights({ insights }: AIInsightsProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <span className="material-icons" aria-hidden>
            auto_awesome
          </span>
          AI Рекомендации
        </div>
      </div>

      <div className={styles.insightsList}>
        {insights.map((insight) => (
          <div key={insight.id} className={styles.insightItem}>
            <div className={`${styles.insightIcon} ${styles[`insightIcon--${insight.type}`]}`}>
              <span className="material-icons" aria-hidden>
                {insightIcons[insight.type]}
              </span>
            </div>
            <div className={styles.insightContent}>
              <div className={styles.insightTitle}>{insight.title}</div>
              <div className={styles.insightText}>{insight.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
