"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./OnboardingTour.module.css";

interface Step {
  id: string;
  title: string;
  description: string;
  target?: string;
  action?: () => void;
}

const steps: Step[] = [
  {
    id: "welcome",
    title: "👋 Добро пожаловать в FinApp!",
    description: "Давайте пройдём краткий тур и настроим ваш финансовый трекер. Это займёт всего 2 минуты.",
  },
  {
    id: "dashboard",
    title: "📊 Дашборд",
    description: "Здесь вы видите общую картину ваших финансов: баланс, последние транзакции и быстрые действия.",
  },
  {
    id: "transactions",
    title: "💰 Транзакции",
    description: "Добавляйте доходы и расходы. Используйте категории и теги для удобного учёта.",
  },
  {
    id: "budgets",
    title: "🎯 Бюджеты",
    description: "Создавайте бюджеты на категории, чтобы контролировать траты и не выходить за рамки.",
  },
  {
    id: "ai-features",
    title: "🤖 AI Помощник",
    description: "Используйте AI для анализа трат, прогнозов и персональных финансовых советов.",
  },
  {
    id: "done",
    title: "🎉 Готово!",
    description: "Теперь вы готовы управлять своими финансами. Начните с добавления первой транзакции!",
  },
];

export default function OnboardingTour() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  async function checkOnboardingStatus() {
    try {
      const res = await fetch("/api/onboarding");
      if (res.ok) {
        const data = await res.json();
        if (!data.completed && !data.skipped) {
          setIsVisible(true);
          setCurrentStep(data.current_step || 0);
        }
      }
    } catch (error) {
      console.error("Failed to check onboarding:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProgress(step: number, completed: boolean = false) {
    try {
      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_step: step,
          step_id: steps[step]?.id,
          completed,
        }),
      });
    } catch (error) {
      console.error("Failed to update onboarding:", error);
    }
  }

  function nextStep() {
    const next = currentStep + 1;
    if (next >= steps.length) {
      finishTour();
    } else {
      setCurrentStep(next);
      updateProgress(next);
      
      // Навигация для определённых шагов
      if (steps[next].id === "transactions") {
        router.push("/finance/transactions");
      } else if (steps[next].id === "budgets") {
        router.push("/finance/budgets");
      } else if (steps[next].id === "ai-features") {
        router.push("/ai-chat");
      }
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      updateProgress(prev);
    }
  }

  async function skipTour() {
    try {
      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipped: true }),
      });
      setIsVisible(false);
    } catch (error) {
      console.error("Failed to skip onboarding:", error);
    }
  }

  async function finishTour() {
    await updateProgress(steps.length - 1, true);
    setIsVisible(false);
    router.push("/finance/dashboard");
  }

  if (loading || !isVisible) {
    return null;
  }

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.progress}>
            <div
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            />
          </div>
          <button className={styles.skipBtn} onClick={skipTour}>
            Пропустить
          </button>
        </div>

        <div className={styles.content}>
          <h2 className={styles.title}>{step.title}</h2>
          <p className={styles.description}>{step.description}</p>
        </div>

        <div className={styles.footer}>
          <div className={styles.dots}>
            {steps.map((_, index) => (
              <div
                key={index}
                className={`${styles.dot} ${
                  index === currentStep ? styles.activeDot : ""
                } ${index < currentStep ? styles.completedDot : ""}`}
              />
            ))}
          </div>

          <div className={styles.actions}>
            {currentStep > 0 && (
              <button className={styles.prevBtn} onClick={prevStep}>
                ← Назад
              </button>
            )}
            <button className={styles.nextBtn} onClick={nextStep}>
              {currentStep === steps.length - 1 ? "Начать!" : "Далее →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
