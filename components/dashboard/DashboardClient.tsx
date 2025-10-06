"use client";

import { useState } from "react";
import styles from "./Dashboard.module.css";
import WidgetSettingsModal from "./WidgetSettingsModal";
import type { WidgetVisibilityState } from "@/lib/dashboard/preferences/shared";

type DashboardClientProps = {
  children: React.ReactNode;
  widgetVisibility: WidgetVisibilityState;
};

export default function DashboardClient({
  children,
  widgetVisibility,
}: DashboardClientProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className={styles.page}>
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
            Настроить виджеты
          </button>
          <i className="material-icons" aria-hidden>
            search
          </i>
          <i className="material-icons" aria-hidden>
            notifications
          </i>
        </div>
      </div>

      {children}

      <WidgetSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialVisibility={widgetVisibility}
      />
    </div>
  );
}
