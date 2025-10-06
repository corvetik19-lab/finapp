import styles from "./FinancialTips.module.css";

export type Tip = {
  id: string;
  icon: string;
  title: string;
  text: string;
};

export type FinancialTipsProps = {
  tips: Tip[];
};

export default function FinancialTips({ tips }: FinancialTipsProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <span className="material-icons" aria-hidden>
            tips_and_updates
          </span>
          Финансовые советы
        </div>
      </div>

      <div className={styles.tipsList}>
        {tips.map((tip) => (
          <div key={tip.id} className={styles.tipItem}>
            <div className={styles.tipIcon}>
              <span className="material-icons" aria-hidden>
                {tip.icon}
              </span>
            </div>
            <div className={styles.tipContent}>
              <div className={styles.tipTitle}>{tip.title}</div>
              <div className={styles.tipText}>{tip.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
