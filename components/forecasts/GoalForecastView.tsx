"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import styles from "./Forecasts.module.css";
import { generateMonthlyProgress, type GoalForecast } from "@/lib/ai/goal-forecast";

export default function GoalForecastView() {
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<GoalForecast[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<GoalForecast | null>(null);

  useEffect(() => {
    loadForecasts();
  }, []);

  async function loadForecasts() {
    try {
      const res = await fetch("/api/ai/goal-forecast");
      if (!res.ok) {
        throw new Error("Failed to load forecasts");
      }
      const data = await res.json();
      setForecasts(data.forecasts || []);
      if (data.forecasts && data.forecasts.length > 0) {
        setSelectedPlan(data.forecasts[0]);
      }
    } catch (err) {
      console.error("Error loading goal forecasts:", err);
      setError("Не удалось загрузить прогнозы целей");
    } finally {
      setLoading(false);
    }
  }

  const formatMoney = (kopecks: number) => {
    const rubles = kopecks / 100;
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rubles);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
    });
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Анализируем ваши планы...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2>Ошибка загрузки</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (forecasts.length === 0) {
    return (
      <div className={styles.error}>
        <div className={styles.errorIcon}>📊</div>
        <h2>Нет финансовых планов</h2>
        <p>Создайте финансовый план на странице "Планы" для просмотра прогноза достижения целей</p>
      </div>
    );
  }

  // График прогресса для выбранного плана
  const chartData = selectedPlan
    ? (() => {
        const progress = generateMonthlyProgress(
          selectedPlan.current_amount,
          selectedPlan.goal_amount,
          selectedPlan.average_monthly_contribution,
          Math.min(selectedPlan.months_to_goal || 12, 24)
        );

        return {
          labels: progress.map((p) => p.month),
          datasets: [
            {
              label: "Прогнозируемая сумма",
              data: progress.map((p) => p.projected_amount / 100),
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              fill: true,
              tension: 0.4,
            },
            {
              label: "Целевая сумма",
              data: progress.map(() => selectedPlan.goal_amount / 100),
              borderColor: "#ef4444",
              borderDash: [5, 5],
              fill: false,
            },
          ],
        };
      })()
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y.toLocaleString("ru-RU")} ₽`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `${value.toLocaleString("ru-RU")} ₽`,
        },
      },
    },
  };

  return (
    <div className={styles.goalForecastView}>
      {/* Список планов */}
      <div className={styles.plansList}>
        <h3>Ваши финансовые планы</h3>
        {forecasts.map((forecast) => (
          <div
            key={forecast.plan_id}
            className={`${styles.planCard} ${
              selectedPlan?.plan_id === forecast.plan_id ? styles.selected : ""
            }`}
            onClick={() => setSelectedPlan(forecast)}
          >
            <div className={styles.planHeader}>
              <h4>{forecast.plan_name}</h4>
              <span className={styles.progress}>{forecast.progress_percentage.toFixed(1)}%</span>
            </div>
            <div className={styles.planAmount}>
              {formatMoney(forecast.current_amount)} / {formatMoney(forecast.goal_amount)}
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min(100, forecast.progress_percentage)}%` }}
              ></div>
            </div>
            {forecast.estimated_completion_date && (
              <div className={styles.planEta}>
                🎯 Достижение: {formatDate(forecast.estimated_completion_date)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Детали выбранного плана */}
      {selectedPlan && (
        <div className={styles.planDetails}>
          <div className={styles.detailsHeader}>
            <h2>{selectedPlan.plan_name}</h2>
            <p className={styles.advice}>{selectedPlan.advice}</p>
          </div>

          {/* Статистика */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Накоплено</div>
              <div className={styles.statValue}>{formatMoney(selectedPlan.current_amount)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Цель</div>
              <div className={styles.statValue}>{formatMoney(selectedPlan.goal_amount)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Осталось</div>
              <div className={styles.statValue}>{formatMoney(selectedPlan.remaining_amount)}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Средний взнос</div>
              <div className={styles.statValue}>
                {formatMoney(selectedPlan.average_monthly_contribution)}/мес
              </div>
            </div>
          </div>

          {/* Сценарии */}
          <div className={styles.scenariosSection}>
            <h3>Сценарии достижения цели</h3>
            <div className={styles.scenariosGrid}>
              <div className={styles.scenarioCard}>
                <div className={styles.scenarioName}>🐢 Консервативный</div>
                <div className={styles.scenarioAmount}>
                  {formatMoney(selectedPlan.scenarios.conservative.monthly_amount)}/мес
                </div>
                <div className={styles.scenarioTime}>
                  {selectedPlan.scenarios.conservative.months_to_goal} мес
                </div>
                <div className={styles.scenarioDate}>
                  {formatDate(selectedPlan.scenarios.conservative.completion_date)}
                </div>
              </div>

              <div className={`${styles.scenarioCard} ${styles.current}`}>
                <div className={styles.scenarioName}>🎯 Текущий темп</div>
                <div className={styles.scenarioAmount}>
                  {formatMoney(selectedPlan.scenarios.current.monthly_amount)}/мес
                </div>
                <div className={styles.scenarioTime}>
                  {selectedPlan.scenarios.current.months_to_goal} мес
                </div>
                <div className={styles.scenarioDate}>
                  {formatDate(selectedPlan.scenarios.current.completion_date)}
                </div>
              </div>

              <div className={styles.scenarioCard}>
                <div className={styles.scenarioName}>🚀 Агрессивный</div>
                <div className={styles.scenarioAmount}>
                  {formatMoney(selectedPlan.scenarios.aggressive.monthly_amount)}/мес
                </div>
                <div className={styles.scenarioTime}>
                  {selectedPlan.scenarios.aggressive.months_to_goal} мес
                </div>
                <div className={styles.scenarioDate}>
                  {formatDate(selectedPlan.scenarios.aggressive.completion_date)}
                </div>
              </div>
            </div>
          </div>

          {/* График прогресса */}
          {chartData && (
            <div className={styles.chartSection}>
              <h3>Прогноз достижения цели</h3>
              <div className={styles.chartContainer}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Рекомендации */}
          {selectedPlan.target_date && selectedPlan.recommended_monthly_contribution && (
            <div className={styles.recommendationCard}>
              <h4>💡 Рекомендация</h4>
              <p>
                Для достижения цели к <strong>{formatDate(selectedPlan.target_date)}</strong>{" "}
                рекомендуем откладывать{" "}
                <strong>{formatMoney(selectedPlan.recommended_monthly_contribution)}</strong> в месяц.
              </p>
              {selectedPlan.average_monthly_contribution <
                selectedPlan.recommended_monthly_contribution && (
                <p className={styles.warning}>
                  ⚠️ Текущие взносы недостаточны. Увеличьте на{" "}
                  {formatMoney(
                    selectedPlan.recommended_monthly_contribution -
                      selectedPlan.average_monthly_contribution
                  )}
                  /мес.
                </p>
              )}
            </div>
          )}

          {/* История взносов */}
          {selectedPlan.topups_history.length > 0 && (
            <div className={styles.historySection}>
              <h4>
                📝 Последние взносы <span>({selectedPlan.topups_count} всего)</span>
              </h4>
              <div className={styles.topupsList}>
                {selectedPlan.topups_history.slice(0, 5).map((topup, idx) => (
                  <div key={idx} className={styles.topupItem}>
                    <span className={styles.topupDate}>
                      {new Date(topup.created_at).toLocaleDateString("ru-RU")}
                    </span>
                    <span className={styles.topupAmount}>{formatMoney(topup.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
