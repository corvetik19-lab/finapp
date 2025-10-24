"use client";

import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from "react-joyride";

const TOUR_STEPS: Step[] = [
  {
    target: "body",
    content: (
      <div style={{ padding: "20px" }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: "24px" }}>
          👋 Добро пожаловать в Finappka!
        </h2>
        <p style={{ margin: 0, fontSize: "16px", lineHeight: "1.6" }}>
          Давайте пройдём краткий тур по приложению. Это займёт всего 2 минуты.
        </p>
      </div>
    ),
    placement: "center",
    disableBeacon: true,
  },
  {
    target: '[data-tour="dashboard-summary"]',
    content: (
      <div>
        <h3 style={{ margin: "0 0 12px 0" }}>📊 Сводка финансов</h3>
        <p style={{ margin: 0 }}>
          Здесь отображается общий баланс, доходы и расходы за текущий месяц.
        </p>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="add-transaction"]',
    content: (
      <div>
        <h3 style={{ margin: "0 0 12px 0" }}>💰 Добавить транзакцию</h3>
        <p style={{ margin: 0 }}>
          Нажмите здесь, чтобы добавить доход или расход. Это основная функция приложения!
        </p>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="nav-transactions"]',
    content: (
      <div>
        <h3 style={{ margin: "0 0 12px 0" }}>📝 Транзакции</h3>
        <p style={{ margin: 0 }}>
          Здесь вы найдёте все свои доходы и расходы. Можно фильтровать, искать и экспортировать в CSV.
        </p>
      </div>
    ),
    placement: "right",
  },
  {
    target: '[data-tour="nav-budgets"]',
    content: (
      <div>
        <h3 style={{ margin: "0 0 12px 0" }}>🎯 Бюджеты</h3>
        <p style={{ margin: 0 }}>
          Создавайте бюджеты на категории, чтобы контролировать траты и не выходить за рамки.
        </p>
      </div>
    ),
    placement: "right",
  },
  {
    target: '[data-tour="nav-reports"]',
    content: (
      <div>
        <h3 style={{ margin: "0 0 12px 0" }}>📊 Отчёты</h3>
        <p style={{ margin: 0 }}>
          Анализируйте свои финансы: графики, статистика по категориям, экспорт в PDF и Excel.
        </p>
      </div>
    ),
    placement: "right",
  },
  {
    target: '[data-tour="nav-ai"]',
    content: (
      <div>
        <h3 style={{ margin: "0 0 12px 0" }}>🤖 AI Помощник</h3>
        <p style={{ margin: 0 }}>
          Используйте искусственный интеллект для прогнозов, советов и автоматической категоризации.
        </p>
      </div>
    ),
    placement: "right",
  },
  {
    target: "body",
    content: (
      <div style={{ padding: "20px" }}>
        <h2 style={{ margin: "0 0 16px 0", fontSize: "24px" }}>
          🎉 Готово!
        </h2>
        <p style={{ margin: "0 0 16px 0", fontSize: "16px", lineHeight: "1.6" }}>
          Теперь вы готовы управлять своими финансами. Начните с добавления первой транзакции!
        </p>
        <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
          💡 Совет: Вы можете перезапустить тур в любое время через настройки.
        </p>
      </div>
    ),
    placement: "center",
  },
];

interface JoyrideTourProps {
  run?: boolean;
  onComplete?: () => void;
}

export default function JoyrideTour({ run: runProp, onComplete }: JoyrideTourProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Проверяем, нужно ли показывать тур
    const tourCompleted = localStorage.getItem("finapp_tour_completed");
    if (!tourCompleted && runProp !== false) {
      // Небольшая задержка для загрузки DOM
      setTimeout(() => setRun(true), 1000);
    }
  }, [runProp]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (type === EVENTS.STEP_AFTER ? 1 : 0));
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem("finapp_tour_completed", "true");
      localStorage.setItem("finapp_tour_completed_at", new Date().toISOString());
      
      if (onComplete) {
        onComplete();
      }

      // Обновляем статус в БД
      fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      }).catch(console.error);
    }
  };

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      scrollOffset={100}
      disableOverlayClose
      disableCloseOnEsc={false}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "#4F46E5",
          textColor: "#1a1a1a",
          backgroundColor: "#ffffff",
          overlayColor: "rgba(0, 0, 0, 0.6)",
          arrowColor: "#ffffff",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "12px",
          padding: "20px",
          fontSize: "16px",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        buttonNext: {
          backgroundColor: "#4F46E5",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "15px",
          fontWeight: 600,
        },
        buttonBack: {
          color: "#666",
          marginRight: "10px",
        },
        buttonSkip: {
          color: "#999",
        },
      }}
      locale={{
        back: "← Назад",
        close: "Закрыть",
        last: "Завершить",
        next: "Далее →",
        open: "Открыть",
        skip: "Пропустить",
      }}
    />
  );
}
