"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import styles from "./NotificationSettings.module.css";

type NotificationCategory = {
  id: string;
  label: string;
  description: string;
  icon: string;
  types: {
    id: string;
    label: string;
    description: string;
  }[];
};

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: "transactions",
    label: "Транзакции",
    description: "Уведомления о создании, изменении и удалении транзакций",
    icon: "receipt",
    types: [
      { id: "transaction_created", label: "Создание транзакции", description: "При добавлении новой транзакции" },
      { id: "transaction_updated", label: "Изменение транзакции", description: "При редактировании транзакции" },
      { id: "transaction_deleted", label: "Удаление транзакции", description: "При удалении транзакции" },
    ],
  },
  {
    id: "budgets",
    label: "Бюджеты",
    description: "Уведомления о бюджетах и их превышении",
    icon: "pie_chart",
    types: [
      { id: "budget_created", label: "Создание бюджета", description: "При создании нового бюджета" },
      { id: "budget_exceeded", label: "Превышение бюджета", description: "Когда бюджет превышен" },
      { id: "budget_warning", label: "Предупреждение о бюджете", description: "При достижении 80% бюджета" },
    ],
  },
  {
    id: "payments",
    label: "Платежи",
    description: "Напоминания о предстоящих и просроченных платежах",
    icon: "receipt_long",
    types: [
      { id: "payment_due", label: "Предстоящий платеж", description: "За 3 дня до платежа" },
      { id: "payment_overdue", label: "Просроченный платеж", description: "Когда платеж просрочен" },
      { id: "payment_completed", label: "Платеж выполнен", description: "После отметки как оплаченный" },
    ],
  },
  {
    id: "plans",
    label: "Планы",
    description: "Уведомления о прогрессе и достижении целей",
    icon: "flag",
    types: [
      { id: "plan_goal_reached", label: "Цель достигнута", description: "При достижении 100% цели" },
      { id: "plan_progress", label: "Прогресс плана", description: "При достижении 25%, 50%, 75%" },
      { id: "plan_topup", label: "Взнос в план", description: "При добавлении средств в план" },
    ],
  },
  {
    id: "debts",
    label: "Долги",
    description: "Уведомления о долгах и их статусе",
    icon: "account_balance_wallet",
    types: [
      { id: "debt_created", label: "Новый долг", description: "При создании долга" },
      { id: "debt_paid", label: "Долг погашен", description: "При полном погашении долга" },
      { id: "debt_overdue", label: "Просроченный долг", description: "Когда долг просрочен" },
    ],
  },
];

export default function NotificationSettingsPage() {
  const { notifications, clearAll } = useNotifications();
  const [enabledTypes, setEnabledTypes] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Загрузка настроек из localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("notification_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        setEnabledTypes(new Set(parsed.enabledTypes || []));
      } else {
        // По умолчанию все включены
        const allTypes = NOTIFICATION_CATEGORIES.flatMap((cat) =>
          cat.types.map((t) => t.id)
        );
        setEnabledTypes(new Set(allTypes));
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    }
  }, []);

  const toggleType = (typeId: string) => {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      return next;
    });
  };


  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(
        "notification_settings",
        JSON.stringify({ enabledTypes: Array.from(enabledTypes) })
      );
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      setIsSaving(false);
    }
  };

  const handleEnableAll = () => {
    const allTypes = NOTIFICATION_CATEGORIES.flatMap((cat) =>
      cat.types.map((t) => t.id)
    );
    setEnabledTypes(new Set(allTypes));
  };

  const handleDisableAll = () => {
    setEnabledTypes(new Set());
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Настройки уведомлений</h1>
          <p className={styles.subtitle}>
            Управляйте типами уведомлений, которые вы хотите получать
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

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={handleEnableAll}
        >
          <span className="material-icons">check_circle</span>
          Включить все
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={handleDisableAll}
        >
          <span className="material-icons">cancel</span>
          Отключить все
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.danger}`}
          onClick={clearAll}
        >
          <span className="material-icons">delete_sweep</span>
        </button>
      </div>

      <div className={styles.categories}>
        {NOTIFICATION_CATEGORIES.map((category) => {
          return (
            <div key={category.id} className={styles.category}>
              <div className={styles.categoryHeader}>
                <div className={styles.categoryInfo}>
                  <div className={styles.categoryTitleRow}>
                    <span className={`material-icons ${styles.categoryIcon}`}>
                      {category.icon}
                    </span>
                    <h2 className={styles.categoryTitle}>{category.label}</h2>
                  </div>
                  <p className={styles.categoryDescription}>{category.description}</p>
                </div>
              </div>

              <div className={styles.types}>
                {category.types.map((type) => {
                  const isEnabled = enabledTypes.has(type.id);

                  return (
                    <div key={type.id} className={styles.type}>
                      <div className={styles.typeInfo}>
                        <h3 className={styles.typeTitle}>{type.label}</h3>
                        <p className={styles.typeDescription}>{type.description}</p>
                      </div>
                      <div
                        className={styles.toggle}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleType(type.id);
                        }}
                      >
                        <span
                          className={`${styles.toggleSwitch} ${
                            isEnabled ? styles.toggleActive : ""
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
