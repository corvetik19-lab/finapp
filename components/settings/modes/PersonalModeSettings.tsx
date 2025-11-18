"use client";

import { useState } from "react";
import styles from "./FinanceModeSettings.module.css";
import PlanSettingsManager from "../PlanSettingsManager";
import type { FinanceSettings } from "@/types/settings";
import type { PlanPresetRecord, PlanTypeRecord } from "../PlanSettingsManager";

interface PersonalModeSettingsProps {
  settings?: FinanceSettings | null;
  planTypes: PlanTypeRecord[];
  planPresets: PlanPresetRecord[];
}

export default function PersonalModeSettings({ settings, planTypes, planPresets }: PersonalModeSettingsProps) {
  const [activeTab, setActiveTab] = useState<"general" | "plans">("general");
  
  const plannedFeatures = [
    "Личные цели",
    "Заметки",
    "Файлы",
  ];
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Настройки режима &quot;Личные&quot;</h1>
          <p className={styles.subtitle}>Параметры для личных целей и планов</p>
        </div>
      </div>

      {/* Табы */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "general" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("general")}
        >
          <span className="material-icons">tune</span>
          Основные
        </button>
        <button
          className={`${styles.tab} ${activeTab === "plans" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("plans")}
        >
          <span className="material-icons">flag</span>
          Планы
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "general" && (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Режим в разработке</h2>
              <p className={styles.sectionDesc}>
                Настройки режима &quot;Личные&quot; будут доступны после завершения разработки функционала.
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
          </>
        )}

        {activeTab === "plans" && (
          <div className={styles.managerWrapper}>
            <PlanSettingsManager
              planTypes={planTypes}
              planPresets={planPresets}
            />
          </div>
        )}
      </div>
    </div>
  );
}
