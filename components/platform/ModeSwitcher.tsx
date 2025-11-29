"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { getAvailableModes, getModeConfig } from "@/lib/platform/mode-registry";
import styles from "./Platform.module.css";

interface ModeSwitcherProps {
  allowedModes?: string[];
}

export default function ModeSwitcher({ allowedModes }: ModeSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<string>("finance");

  // Filter modes based on allowedModes prop
  const allModes = getAvailableModes();
  const availableModes = allowedModes && allowedModes.length > 0
    ? allModes.filter(mode => allowedModes.includes(mode.key))
    : allModes;
  
  // Если доступен только один режим - не показываем переключатель
  const singleModeOnly = availableModes.length === 1;

  useEffect(() => {
    // Если мы в админке или глобальных настройках, сбрасываем активный режим
    if (pathname.startsWith('/admin') || pathname.startsWith('/settings')) {
      setCurrentMode('');
      return;
    }

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

  const current = (pathname.startsWith('/admin') || pathname.startsWith('/settings'))
    ? { name: 'Администрирование', icon: 'settings', color: '#64748b' }
    : getModeConfig(currentMode);

  if (!current) return null;

  // Если доступен только один режим - показываем только название без возможности переключения
  if (singleModeOnly && !pathname.startsWith('/admin') && !pathname.startsWith('/settings')) {
    const singleMode = availableModes[0];
    return (
      <div className={styles.modeSwitcher}>
        <div className={styles.modeSwitcherStatic}>
          <span
            className="material-icons"
            style={{ color: singleMode.color }}
          >
            {singleMode.icon}
          </span>
          <span className={styles.modeNameDesktop}>{singleMode.name}</span>
        </div>
      </div>
    );
  }

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
        <span className={styles.modeNameDesktop}>{current.name}</span>
        <span className="material-icons">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
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
        </>,
        document.body
      )}
    </div>
  );
}
