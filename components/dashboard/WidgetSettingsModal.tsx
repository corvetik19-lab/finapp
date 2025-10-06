"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Dashboard.module.css";
import {
  DASHBOARD_WIDGETS,
  WIDGET_INFO,
  type DashboardWidgetKey,
  type WidgetVisibilityState,
} from "@/lib/dashboard/preferences/shared";
import { saveWidgetVisibility } from "@/lib/dashboard/preferences/client";

type WidgetSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialVisibility: WidgetVisibilityState;
};

export default function WidgetSettingsModal({
  isOpen,
  onClose,
  initialVisibility,
}: WidgetSettingsModalProps) {
  const router = useRouter();
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<DashboardWidgetKey>>(
    new Set(initialVisibility.hidden)
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const toggleWidget = (widgetKey: DashboardWidgetKey) => {
    const newHidden = new Set(hiddenWidgets);
    if (newHidden.has(widgetKey)) {
      newHidden.delete(widgetKey);
    } else {
      newHidden.add(widgetKey);
    }
    setHiddenWidgets(newHidden);
  };

  const handleSelectAll = () => {
    setHiddenWidgets(new Set());
  };

  const handleDeselectAll = () => {
    const allWidgets = Object.values(DASHBOARD_WIDGETS) as DashboardWidgetKey[];
    setHiddenWidgets(new Set(allWidgets));
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await saveWidgetVisibility({ hidden: Array.from(hiddenWidgets) });
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Failed to save widget settings:", error);
      alert("Не удалось сохранить настройки");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Настройка виджетов</h2>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            disabled={isSaving}
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p className={styles.modalDescription} style={{ margin: 0 }}>
              Выберите виджеты, которые хотите видеть на дашборде
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={isSaving}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  border: '1px solid rgba(21,101,192,0.3)',
                  borderRadius: '6px',
                  background: 'rgba(21,101,192,0.1)',
                  color: 'var(--primary-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(21,101,192,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(21,101,192,0.1)';
                }}
              >
                Выбрать все
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                disabled={isSaving}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  border: '1px solid rgba(148,163,184,0.3)',
                  borderRadius: '6px',
                  background: 'rgba(148,163,184,0.1)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(148,163,184,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(148,163,184,0.1)';
                }}
              >
                Снять все
              </button>
            </div>
          </div>

          <div className={styles.widgetList}>
            {Object.values(DASHBOARD_WIDGETS).map((widgetKey) => {
              const info = WIDGET_INFO[widgetKey];
              const isVisible = !hiddenWidgets.has(widgetKey);

              return (
                <label
                  key={widgetKey}
                  className={`${styles.widgetItem} ${isVisible ? styles.widgetItemActive : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleWidget(widgetKey)}
                    className={styles.widgetCheckbox}
                  />
                  <div className={styles.widgetIcon}>
                    <span className="material-icons">{info.icon}</span>
                  </div>
                  <div className={styles.widgetContent}>
                    <div className={styles.widgetTitle}>{info.title}</div>
                    <div className={styles.widgetDescription}>{info.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={isSaving}
          >
            Отмена
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
