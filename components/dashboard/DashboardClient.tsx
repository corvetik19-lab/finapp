"use client";

import { useState } from "react";
import styles from "./Dashboard.module.css";
import { DashboardCustomizer } from "./DashboardCustomizer";
import type { WidgetVisibilityState } from "@/lib/dashboard/preferences/shared";
import TourGuide from "@/components/onboarding/TourGuide";
import OnboardingChecklist from "@/components/onboarding/OnboardingChecklist";

type DashboardClientProps = {
  children: React.ReactNode;
  widgetVisibility: WidgetVisibilityState;
};

export default function DashboardClient({
  children,
}: DashboardClientProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className={styles.page}>
      {/* Интерактивный тур по дашборду */}
      <TourGuide page="dashboard" />

      <div className={styles.topBar}>
        <div className={styles.pageTitle}>Дашборд</div>
        <div className={styles.topBarActions}>
          <button
            type="button"
            className={styles.settingsBtn}
            onClick={() => setIsSettingsOpen(true)}
          >
            <span className="material-icons" aria-hidden>
              tune
            </span>
            Настроить дашборд
          </button>
        </div>
      </div>

      {/* Чек-лист "Первые шаги" */}
      <OnboardingChecklist />

      {children}

      {isSettingsOpen && (
        <DashboardCustomizer onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
}
