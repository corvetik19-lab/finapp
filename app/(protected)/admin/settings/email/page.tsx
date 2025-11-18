"use client";

import { useState, useEffect } from "react";
import styles from "./styles.module.css";

interface EmailPreferences {
  budget_alerts_enabled: boolean;
  transaction_alerts_enabled: boolean;
  weekly_summary_enabled: boolean;
  weekly_summary_day: number;
  weekly_summary_time: string;
  custom_email: string | null;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Понедельник" },
  { value: 2, label: "Вторник" },
  { value: 3, label: "Среда" },
  { value: 4, label: "Четверг" },
  { value: 5, label: "Пятница" },
  { value: 6, label: "Суббота" },
  { value: 7, label: "Воскресенье" },
];

export default function EmailSettingsPage() {
  const [preferences, setPreferences] = useState<EmailPreferences>({
    budget_alerts_enabled: true,
    transaction_alerts_enabled: true,
    weekly_summary_enabled: false,
    weekly_summary_day: 1,
    weekly_summary_time: "09:00",
    custom_email: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch("/api/user/email-preferences");
      if (!response.ok) throw new Error("Failed to load preferences");
      
      const data = await response.json();
      setPreferences({
        ...data,
        weekly_summary_time: data.weekly_summary_time?.substring(0, 5) || "09:00",
      });
    } catch (error) {
      console.error("Error loading preferences:", error);
      setMessage({ type: "error", text: "Не удалось загрузить настройки" });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/email-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) throw new Error("Failed to save preferences");

      setMessage({ type: "success", text: "Настройки успешно сохранены!" });
      
      // Скрыть сообщение через 3 секунды
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving preferences:", error);
      setMessage({ type: "error", text: "Не удалось сохранить настройки" });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof EmailPreferences, value: boolean | number | string | null) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка настроек...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📧 Настройки Email Уведомлений</h1>
        <p className={styles.subtitle}>
          Управляйте типами уведомлений, которые вы хотите получать на email
        </p>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Типы уведомлений</h2>

        {/* Бюджетные алерты */}
        <div className={styles.setting}>
          <div className={styles.settingInfo}>
            <div className={styles.settingIcon}>💰</div>
            <div>
              <h3 className={styles.settingLabel}>Превышение бюджета</h3>
              <p className={styles.settingDescription}>
                Получать уведомления когда расходы достигают 80% от бюджета
              </p>
            </div>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={preferences.budget_alerts_enabled}
              onChange={(e) => updatePreference("budget_alerts_enabled", e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        {/* Алерты крупных транзакций */}
        <div className={styles.setting}>
          <div className={styles.settingInfo}>
            <div className={styles.settingIcon}>💸</div>
            <div>
              <h3 className={styles.settingLabel}>Крупные транзакции</h3>
              <p className={styles.settingDescription}>
                Получать уведомления о необычно крупных тратах
              </p>
            </div>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={preferences.transaction_alerts_enabled}
              onChange={(e) => updatePreference("transaction_alerts_enabled", e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        {/* Еженедельная сводка */}
        <div className={styles.setting}>
          <div className={styles.settingInfo}>
            <div className={styles.settingIcon}>📊</div>
            <div>
              <h3 className={styles.settingLabel}>Еженедельная сводка</h3>
              <p className={styles.settingDescription}>
                Получать финансовый отчёт за неделю
              </p>
            </div>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={preferences.weekly_summary_enabled}
              onChange={(e) => updatePreference("weekly_summary_enabled", e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        {/* Настройки еженедельной сводки */}
        {preferences.weekly_summary_enabled && (
          <div className={styles.subsection}>
            <div className={styles.subsectionTitle}>Расписание еженедельной сводки</div>
            
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>День недели</label>
                <select
                  className={styles.select}
                  value={preferences.weekly_summary_day}
                  onChange={(e) => updatePreference("weekly_summary_day", parseInt(e.target.value))}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Время</label>
                <input
                  type="time"
                  className={styles.input}
                  value={preferences.weekly_summary_time}
                  onChange={(e) => updatePreference("weekly_summary_time", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Кастомный email (опционально) */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Дополнительно</h2>
        
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            Альтернативный email адрес (необязательно)
          </label>
          <p className={styles.fieldHint}>
            По умолчанию уведомления отправляются на ваш основной email
          </p>
          <input
            type="email"
            className={styles.input}
            placeholder="your.email@example.com"
            value={preferences.custom_email || ""}
            onChange={(e) => updatePreference("custom_email", e.target.value || null)}
          />
        </div>
      </div>

      {/* Кнопка сохранения */}
      <div className={styles.actions}>
        <button
          className={styles.saveButton}
          onClick={savePreferences}
          disabled={saving}
        >
          {saving ? "Сохранение..." : "Сохранить настройки"}
        </button>
      </div>

      {/* Информация */}
      <div className={styles.info}>
        <div className={styles.infoIcon}>ℹ️</div>
        <div>
          <p className={styles.infoText}>
            <strong>Важно:</strong> Для отправки email уведомлений убедитесь, что в настройках проекта указан ключ Resend API.
          </p>
          <p className={styles.infoText}>
            Подробнее: <code>docs/EMAIL_SETUP.md</code>
          </p>
        </div>
      </div>
    </div>
  );
}
