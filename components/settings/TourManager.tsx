"use client";

import { useState, useEffect } from "react";
import styles from "@/components/settings/Settings.module.css";

type TourStatus = {
  dashboard: boolean;
  transactions: boolean;
  reports: boolean;
  plans: boolean;
  settings: boolean;
  loans: boolean;
  cards: boolean;
};

const TOUR_LABELS: Record<keyof TourStatus, string> = {
  dashboard: "Дашборд",
  transactions: "Транзакции",
  reports: "Отчёты",
  plans: "Планы и цели",
  settings: "Настройки",
  loans: "Кредиты",
  cards: "Кредитные карты",
};

const DEFAULT_TOUR_STATUS: TourStatus = {
  dashboard: false,
  transactions: false,
  reports: false,
  plans: false,
  settings: false,
  loans: false,
  cards: false,
};

export default function TourManager() {
  const [enabled, setEnabled] = useState(true);
  const [completedTours, setCompletedTours] = useState<TourStatus>(DEFAULT_TOUR_STATUS);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const loadTourSettings = async () => {
      try {
        const response = await fetch("/api/settings/tour");
        if (response.ok) {
          const data = await response.json();
          setEnabled(data.enabled ?? true);
          setCompletedTours(data.completedTours ?? DEFAULT_TOUR_STATUS);
        }
      } catch (error) {
        console.error("Error loading tour settings:", error);
      }
    };

    loadTourSettings();
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings/tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          completedTours,
        }),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      setMessage({ type: "success", text: "Настройки тура успешно сохранены" });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Не удалось сохранить настройки" });
    } finally {
      setIsSaving(false);
    }
  };

  const resetAllTours = () => {
    const resetTours = Object.keys(DEFAULT_TOUR_STATUS).reduce((acc, key) => {
      acc[key as keyof TourStatus] = false;
      return acc;
    }, {} as TourStatus);

    setCompletedTours(resetTours);
    setMessage({ type: "success", text: "Прогресс туров сброшен" });
  };

  const toggleTour = (tourKey: keyof TourStatus) => {
    setCompletedTours((prev) => ({
      ...prev,
      [tourKey]: !prev[tourKey],
    }));
  };

  return (
    <div className={styles.cardStack}>
      {/* Основные настройки */}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Управление туром</h3>
        <p className={styles.sectionSubtitle}>
          Настройте отображение интерактивных подсказок и туров по приложению
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Глобальное включение/выключение */}
          <div style={{ 
            padding: "16px", 
            borderRadius: "12px", 
            background: "var(--muted-bg)",
            border: "1px solid var(--border-color)"
          }}>
            <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                style={{ 
                  width: "20px", 
                  height: "20px",
                  cursor: "pointer",
                  accentColor: "var(--primary-color)"
                }}
              />
              <div>
                <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                  Включить туры по приложению
                </div>
                <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                  При входе на новые страницы будут показываться интерактивные подсказки
                </div>
              </div>
            </label>
          </div>

          {/* Кнопки управления */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={saveSettings} className={styles.btn} disabled={isSaving}>
              <span className="material-icons" style={{ fontSize: "18px" }}>save</span>
              {isSaving ? "Сохранение..." : "Сохранить настройки"}
            </button>
            <button onClick={resetAllTours} className={styles.btnSecondary}>
              <span className="material-icons" style={{ fontSize: "18px" }}>refresh</span>
              Сбросить все туры
            </button>
          </div>

          {message && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                background: message.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${message.type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                color: message.type === "success" ? "var(--success)" : "var(--danger)",
                fontSize: "14px",
              }}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>

      {/* Туры по разделам */}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Статус туров по разделам</h3>
        <p className={styles.sectionSubtitle}>
          Отметьте разделы, где вы хотите показывать или скрывать туры
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {(Object.keys(TOUR_LABELS) as Array<keyof TourStatus>).map((tourKey) => (
            <div
              key={tourKey}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: "8px",
                background: "var(--muted-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span
                  className="material-icons"
                  style={{
                    fontSize: "24px",
                    color: completedTours[tourKey] ? "var(--success)" : "var(--text-secondary)",
                  }}
                >
                  {completedTours[tourKey] ? "check_circle" : "radio_button_unchecked"}
                </span>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {TOUR_LABELS[tourKey]}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                    {completedTours[tourKey] ? "Тур пройден" : "Тур не пройден"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleTour(tourKey)}
                className={styles.btnSecondary}
                style={{ fontSize: "13px", padding: "6px 12px" }}
              >
                {completedTours[tourKey] ? "Показать снова" : "Отметить пройденным"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Справка */}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>О турах</h3>
        <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.7" }}>
          <p style={{ marginBottom: "12px" }}>
            <strong style={{ color: "var(--text-primary)" }}>Интерактивные туры</strong> помогают новым пользователям быстрее освоить функционал приложения.
          </p>
          <p style={{ marginBottom: "12px" }}>
            При первом посещении разделов автоматически запускаются подсказки, которые шаг за шагом объясняют основные возможности.
          </p>
          <p>
            Вы можете:
          </p>
          <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
            <li>Отключить туры полностью</li>
            <li>Сбросить прогресс и пройти туры заново</li>
            <li>Управлять отдельными турами по разделам</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
