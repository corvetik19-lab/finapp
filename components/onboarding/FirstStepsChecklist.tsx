"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./FirstStepsChecklist.module.css";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: string;
  icon: string;
}

export default function FirstStepsChecklist() {
  const router = useRouter();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadChecklist = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding/checklist");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || getDefaultItems());
        setIsVisible(!data.all_completed);
      } else {
        setItems(getDefaultItems());
      }
    } catch (error) {
      console.error("Failed to load checklist:", error);
      setItems(getDefaultItems());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  function getDefaultItems(): ChecklistItem[] {
    return [
      {
        id: "add_account",
        title: "Добавить счёт",
        description: "Создайте первый счёт (наличные, карта или банк)",
        completed: false,
        action: "/finance/cards",
        icon: "💳",
      },
      {
        id: "add_transaction",
        title: "Добавить транзакцию",
        description: "Запишите первый доход или расход",
        completed: false,
        action: "/finance/transactions",
        icon: "💰",
      },
      {
        id: "create_category",
        title: "Создать категорию",
        description: "Настройте категории под свои нужды",
        completed: false,
        action: "/finance/settings",
        icon: "📂",
      },
      {
        id: "set_budget",
        title: "Установить бюджет",
        description: "Создайте первый бюджет для контроля трат",
        completed: false,
        action: "/finance/budgets",
        icon: "🎯",
      },
      {
        id: "try_ai",
        title: "Попробовать AI",
        description: "Задайте вопрос AI помощнику о ваших финансах",
        completed: false,
        action: "/ai-chat",
        icon: "🤖",
      },
    ];
  }

  async function markCompleted(itemId: string) {
    try {
      await fetch("/api/onboarding/checklist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, completed: true }),
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, completed: true } : item
        )
      );

      // Проверяем, все ли выполнено
      const allCompleted = items.every(
        (item) => item.id === itemId || item.completed
      );
      if (allCompleted) {
        setTimeout(() => setIsVisible(false), 2000);
      }
    } catch (error) {
      console.error("Failed to mark completed:", error);
    }
  }

  function handleAction(item: ChecklistItem) {
    if (item.action) {
      router.push(item.action);
    }
  }

  function dismiss() {
    setIsVisible(false);
    localStorage.setItem("finapp_checklist_dismissed", "true");
  }

  if (loading || !isVisible) {
    return null;
  }

  const completedCount = items.filter((item) => item.completed).length;
  const progress = (completedCount / items.length) * 100;
  const allCompleted = completedCount === items.length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>
            {allCompleted ? "🎉 Отличная работа!" : "🚀 Первые шаги"}
          </h3>
          <p className={styles.subtitle}>
            {allCompleted
              ? "Вы освоили основы Finappka!"
              : `${completedCount} из ${items.length} выполнено`}
          </p>
        </div>
        <button className={styles.closeBtn} onClick={dismiss} title="Скрыть">
          ✕
        </button>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressBar} style={{ width: `${progress}%` }} />
      </div>

      <div className={styles.list}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`${styles.item} ${
              item.completed ? styles.completed : ""
            }`}
          >
            <div className={styles.checkbox}>
              {item.completed ? (
                <span className={styles.checkmark}>✓</span>
              ) : (
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => markCompleted(item.id)}
                />
              )}
            </div>

            <div className={styles.content}>
              <div className={styles.itemHeader}>
                <span className={styles.icon}>{item.icon}</span>
                <h4 className={styles.itemTitle}>{item.title}</h4>
              </div>
              <p className={styles.itemDescription}>{item.description}</p>
            </div>

            {!item.completed && item.action && (
              <button
                className={styles.actionBtn}
                onClick={() => handleAction(item)}
              >
                Перейти →
              </button>
            )}
          </div>
        ))}
      </div>

      {allCompleted && (
        <div className={styles.celebration}>
          <p>
            🎊 Теперь вы готовы эффективно управлять своими финансами!
          </p>
        </div>
      )}
    </div>
  );
}
