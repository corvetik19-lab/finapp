"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import styles from "./NotificationSettings.module.css";

interface NotificationSettings {
  overspend_alerts: boolean;
  budget_warnings: boolean;
  missing_transaction_reminders: boolean;
  upcoming_payment_reminders: boolean;
  ai_insights: boolean;
  ai_recommendations: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  notification_frequency: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  schedule_enabled: boolean;
  schedule_time: string;
  schedule_days: number[];
  telegram_enabled: boolean;
  telegram_chat_id: number | null;
  telegram_username: string | null;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 7, label: "Вс" },
];

export default function NotificationSettingsPage() {
  const { notifications, clearAll } = useNotifications();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Загрузка настроек при монтировании
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/settings/notifications");
      if (!response.ok) throw new Error("Failed to load settings");
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError("Не удалось загрузить настройки");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Не удалось сохранить настройки");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const updateSetting = (key: keyof NotificationSettings, value: unknown) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: value,
    });
  };

  const toggleDay = (day: number) => {
    if (!settings) return;
    const days = settings.schedule_days || [];
    const newDays = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day].sort();
    updateSetting("schedule_days", newDays);
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error || "Не удалось загрузить настройки"}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Настройки уведомлений</h1>
          <p className={styles.subtitle}>
            Настройте типы уведомлений, время и канал доставки
          </p>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{notifications.length}</span>
            <span className={styles.statLabel}>Всего уведомлений</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {notifications.filter((n) => !n.read).length}
            </span>
            <span className={styles.statLabel}>Непрочитанных</span>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span className="material-icons">error</span>
          {error}
        </div>
      )}

      {success && (
        <div className={styles.successBanner}>
          <span className="material-icons">check_circle</span>
          Настройки успешно сохранены
        </div>
      )}

      {/* Telegram интеграция */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className="material-icons">telegram</span>
          Telegram уведомления
        </h2>
        
        <div className={styles.telegramStatus}>
          {settings.telegram_chat_id ? (
            <div className={styles.telegramConnected}>
              <span className="material-icons">check_circle</span>
              <div>
                <strong>Telegram подключен</strong>
                {settings.telegram_username && <p>@{settings.telegram_username}</p>}
              </div>
            </div>
          ) : (
            <div className={styles.telegramDisconnected}>
              <span className="material-icons">info</span>
              <div>
                <strong>Telegram не подключен</strong>
                <p>Перейдите в настройки Telegram для привязки бота</p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Отправлять в Telegram</h3>
            <p>Получать уведомления в Telegram бот</p>
          </div>
          <button
            type="button"
            className={`${styles.toggle} ${settings.telegram_enabled ? styles.toggleActive : ""}`}
            onClick={() => toggleSetting("telegram_enabled")}
            disabled={!settings.telegram_chat_id}
          >
            <span className={styles.toggleSwitch} />
          </button>
        </div>
      </div>

      {/* Расписание */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className="material-icons">schedule</span>
          Расписание уведомлений
        </h2>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Использовать расписание</h3>
            <p>Отправлять уведомления в определённое время</p>
          </div>
          <button
            type="button"
            className={`${styles.toggle} ${settings.schedule_enabled ? styles.toggleActive : ""}`}
            onClick={() => toggleSetting("schedule_enabled")}
          >
            <span className={styles.toggleSwitch} />
          </button>
        </div>

        {settings.schedule_enabled && (
          <>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <h3>Время отправки</h3>
                <p>Выберите время для получения уведомлений</p>
              </div>
              <input
                type="time"
                className={styles.timeInput}
                value={settings.schedule_time}
                onChange={(e) => updateSetting("schedule_time", e.target.value)}
              />
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <h3>Дни недели</h3>
                <p>Выберите дни для получения уведомлений</p>
              </div>
              <div className={styles.daysSelector}>
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    className={`${styles.dayButton} ${
                      settings.schedule_days?.includes(day.value) ? styles.dayActive : ""
                    }`}
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Тихие часы (начало)</h3>
            <p>Не отправлять уведомления с этого времени</p>
          </div>
          <input
            type="time"
            className={styles.timeInput}
            value={settings.quiet_hours_start || ""}
            onChange={(e) => updateSetting("quiet_hours_start", e.target.value || null)}
          />
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Тихие часы (конец)</h3>
            <p>Возобновить отправку с этого времени</p>
          </div>
          <input
            type="time"
            className={styles.timeInput}
            value={settings.quiet_hours_end || ""}
            onChange={(e) => updateSetting("quiet_hours_end", e.target.value || null)}
          />
        </div>
      </div>

      {/* Типы уведомлений */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className="material-icons">notifications_active</span>
          Типы уведомлений
        </h2>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Превышение трат</h3>
            <p>Уведомления об аномальных тратах</p>
          </div>
          <button
            type="button"
            className={`${styles.toggle} ${settings.overspend_alerts ? styles.toggleActive : ""}`}
            onClick={() => toggleSetting("overspend_alerts")}
          >
            <span className={styles.toggleSwitch} />
          </button>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Бюджетные предупреждения</h3>
            <p>Уведомления о превышении бюджетов</p>
          </div>
          <button
            type="button"
            className={`${styles.toggle} ${settings.budget_warnings ? styles.toggleActive : ""}`}
            onClick={() => toggleSetting("budget_warnings")}
          >
            <span className={styles.toggleSwitch} />
          </button>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Напоминания о транзакциях</h3>
            <p>Напоминания о пропущенных днях</p>
          </div>
          <button
            type="button"
            className={`${styles.toggle} ${settings.missing_transaction_reminders ? styles.toggleActive : ""}`}
            onClick={() => toggleSetting("missing_transaction_reminders")}
          >
            <span className={styles.toggleSwitch} />
          </button>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Предстоящие платежи</h3>
            <p>Напоминания о платежах</p>
          </div>
          <button
            type="button"
            className={`${styles.toggle} ${settings.upcoming_payment_reminders ? styles.toggleActive : ""}`}
            onClick={() => toggleSetting("upcoming_payment_reminders")}
          >
            <span className={styles.toggleSwitch} />
          </button>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>AI инсайты</h3>
            <p>Финансовые инсайты на основе AI</p>
          </div>
          <button
            type="button"
            className={`${styles.toggle} ${settings.ai_insights ? styles.toggleActive : ""}`}
            onClick={() => toggleSetting("ai_insights")}
          >
            <span className={styles.toggleSwitch} />
          </button>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>AI рекомендации</h3>
            <p>Персональные рекомендации</p>
          </div>
          <button
            type="button"
            className={`${styles.toggle} ${settings.ai_recommendations ? styles.toggleActive : ""}`}
            onClick={() => toggleSetting("ai_recommendations")}
          >
            <span className={styles.toggleSwitch} />
          </button>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.danger}`}
          onClick={clearAll}
        >
          <span className="material-icons">delete_sweep</span>
          Очистить все
        </button>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <span className="material-icons rotating">hourglass_top</span>
              Сохранение...
            </>
          ) : (
            <>
              <span className="material-icons">save</span>
              Сохранить настройки
            </>
          )}
        </button>
      </div>
    </div>
  );
}
