"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAvailableModes, getModeConfig } from "@/lib/platform/mode-registry";
import styles from "./Platform.module.css";

export default function ModeSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<string>("finance");

  const availableModes = getAvailableModes();

  useEffect(() => {
    // Определяем текущий режим из URL
    const modeKey = pathname.split("/")[1];
    const mode = getModeConfig(modeKey);
    if (mode && mode.isEnabled) {
      setCurrentMode(modeKey);
    }
  }, [pathname]);

  const handleModeSwitch = (modeKey: string) => {
    const mode = getModeConfig(modeKey);
    if (!mode) return;

    router.push(mode.routes.dashboard);
    setIsOpen(false);
  };

  const current = getModeConfig(currentMode);
  if (!current) return null;

  return (
    <div className={styles.modeSwitcher}>
      <button
        className={styles.modeSwitcherButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Переключить режим"
      >
        <span
          className="material-icons"
          style={{ color: current.color }}
        >
          {current.icon}
        </span>
        <span className={styles.modeNamedesktop}>{current.name}</span>
        <span className="material-icons">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className={styles.modeSwitcherOverlay}
            onClick={() => setIsOpen(false)}
          />
          <div className={styles.modeSwitcherDropdown}>
            <div className={styles.modeSwitcherHeader}>
              <h3>Режимы работы</h3>
              <p>Выберите режим для переключения</p>
            </div>

            <div className={styles.modeList}>
              {availableModes.map((mode) => (
                <button
                  key={mode.key}
                  className={`${styles.modeItem} ${
                    mode.key === currentMode ? styles.modeItemActive : ""
                  }`}
                  onClick={() => handleModeSwitch(mode.key)}
                  disabled={mode.key === currentMode}
                >
                  <div className={styles.modeItemIcon}>
                    <span
                      className="material-icons"
                      style={{ color: mode.color }}
                    >
                      {mode.icon}
                    </span>
                  </div>
                  <div className={styles.modeItemContent}>
                    <div className={styles.modeItemHeader}>
                      <span className={styles.modeItemName}>{mode.name}</span>
                      {mode.isPremium && (
                        <span className={styles.modeBadgePremium}>PRO</span>
                      )}
                      {mode.key === currentMode && (
                        <span className={styles.modeBadgeActive}>Активен</span>
                      )}
                    </div>
                    <p className={styles.modeItemDescription}>
                      {mode.description}
                    </p>
                  </div>
                  {mode.key === currentMode && (
                    <span className="material-icons" style={{ color: mode.color }}>
                      check_circle
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className={styles.modeSwitcherFooter}>
              <p>Скоро появятся новые режимы! 🚀</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
