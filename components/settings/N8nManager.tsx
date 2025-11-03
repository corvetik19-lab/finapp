"use client";

import styles from "./Settings.module.css";

/**
 * N8nManager - управление интеграцией с n8n для автоматизации
 * TODO: Реализовать интеграцию с n8n
 */
export default function N8nManager() {
  return (
    <div className={styles.settingsCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>
          <span className="material-icons">settings_suggest</span>
          n8n Автоматизация
        </h2>
        <p className={styles.cardDescription}>
          Настройка автоматизации финансовых процессов через n8n
        </p>
      </div>

      <div className={styles.placeholderCard}>
        <div className={styles.placeholderIcon}>
          <span className="material-icons">construction</span>
        </div>
        <div className={styles.placeholderTitle}>Раздел в разработке</div>
        <p className={styles.placeholderText}>
          Интеграция с n8n для автоматизации финансовых процессов будет доступна в следующих версиях.
        </p>
        <p className={styles.placeholderText}>
          Планируемые функции:
        </p>
        <ul className={styles.placeholderList}>
          <li>Автоматический импорт транзакций из банков</li>
          <li>Уведомления о превышении бюджета</li>
          <li>Автоматическое создание отчётов</li>
          <li>Интеграция с внешними сервисами</li>
          <li>Webhook для событий приложения</li>
        </ul>
      </div>
    </div>
  );
}
