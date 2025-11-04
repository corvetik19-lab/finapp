"use client";

import { getModeConfig } from "@/lib/platform/mode-registry";
import styles from "./ModePlaceholder.module.css";

interface ModePlaceholderProps {
  modeKey: string;
}

export default function ModePlaceholder({ modeKey }: ModePlaceholderProps) {
  const mode = getModeConfig(modeKey);

  if (!mode) {
    return <div>Режим не найден</div>;
  }

  const features = [
    mode.features.ai && "AI-ассистент и умная аналитика",
    mode.features.analytics && "Детальная аналитика и отчёты",
    mode.features.exports && "Экспорт данных в различных форматах",
    mode.features.integrations && "Интеграции с внешними сервисами",
    mode.features.notifications && "Умные уведомления",
  ].filter(Boolean);

  return (
    <div className={styles.placeholder}>
      <div className={styles.placeholderCard}>
        <div 
          className={styles.placeholderIcon}
          style={{ background: `${mode.color}20` }}
        >
          <span 
            className="material-icons"
            style={{ color: mode.color, fontSize: 64 }}
          >
            {mode.icon}
          </span>
        </div>

        <h1 className={styles.placeholderTitle}>
          {mode.name}
        </h1>

        <p className={styles.placeholderDescription}>
          {mode.description}
        </p>

        {mode.isPremium && (
          <div className={styles.premiumBadge}>
            <span className="material-icons">star</span>
            Premium функция
          </div>
        )}

        <div className={styles.comingSoon}>
          <span className="material-icons">schedule</span>
          Скоро появится
        </div>

        {features.length > 0 && (
          <div className={styles.featuresSection}>
            <h3 className={styles.featuresTitle}>Планируемые возможности:</h3>
            <ul className={styles.featuresList}>
              {features.map((feature, index) => (
                <li key={index} className={styles.featureItem}>
                  <span className="material-icons">check_circle</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.notifySection}>
          <p>Хотите узнать первым, когда режим будет готов?</p>
          <button className={styles.notifyButton}>
            <span className="material-icons">notifications_active</span>
            Уведомить меня
          </button>
        </div>

        <div className={styles.backLink}>
          <a href="/finance/dashboard">
            <span className="material-icons">arrow_back</span>
            Вернуться к финансам
          </a>
        </div>
      </div>
    </div>
  );
}
