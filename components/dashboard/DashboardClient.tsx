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
  showCustomizeButton?: boolean;
};

export default function DashboardClient({
  children,
  showCustomizeButton = true,
}: DashboardClientProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className={styles.page}>
      {/* Интерактивный тур по дашборду */}
      <TourGuide page="dashboard" />

      <div className={styles.topBar}>
        <div className={styles.pageTitle}>Дашборд</div>
        {showCustomizeButton && (
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
        )}
      </div>

      {/* Чек-лист "Первые шаги" */}
      <OnboardingChecklist />

      {children}

      {showCustomizeButton && isSettingsOpen && (
        <DashboardCustomizer onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
}
