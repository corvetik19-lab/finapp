"use client";

import styles from "./FinanceModeSettings.module.css";
import type { FinanceSettings } from "@/types/settings";

interface InvestmentsModeSettingsProps {
  settings?: FinanceSettings | null;
}

export default function InvestmentsModeSettings({ settings }: InvestmentsModeSettingsProps) {
  const plannedFeatures = [
    "Брокерские счета",
    "Типы активов",
    "Стратегии",
    "Портфель",
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Настройки режима &quot;Инвестиции&quot;</h1>
          <p className={styles.subtitle}>Параметры для управления инвестиционным портфелем</p>
        </div>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Режим в разработке</h2>
          <p className={styles.sectionDesc}>
            Настройки режима &quot;Инвестиции&quot; будут доступны после завершения разработки функционала.
          </p>

          <div className={styles.featureGrid}>
            {plannedFeatures.map((feature) => (
              <div key={feature} className={styles.featureCard}>
                <span className="material-icons" style={{ color: "#f59e0b" }}>schedule</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {settings ? (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Текущее состояние</h3>
            <p className={styles.sectionDesc}>
              Базовые настройки сохранены, но функционал будет доступен после завершения разработки.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
