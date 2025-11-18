"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import styles from "./Forecasts.module.css";
import EnhancedForecastView from "@/components/forecasts/EnhancedForecastView";
import GoalForecastView from "@/components/forecasts/GoalForecastView";
import SpendingAlertsView from "@/components/forecasts/SpendingAlertsView";
import OptimizationView from "@/components/forecasts/OptimizationView";

interface ExpenseForecast {
  month: string;
  predicted_expense: number;
  confidence: number;
  trend: "increasing" | "decreasing" | "stable";
  factors: string[];
}

interface WhatIfScenario {
  name: string;
  description: string;
  monthly_change: number;
  affects: "income" | "expense";
  category?: string;
}

interface ScenarioResult {
  scenario: WhatIfScenario;
  original_balance: number;
  new_balance: number;
  difference: number;
  impact_percentage: number;
  recommendation: string;
  timeline: { month: string; balance: number }[];
}

export default function ForecastsClient() {
  const [mounted, setMounted] = useState(false);
  const [forecast, setForecast] = useState<ExpenseForecast | null>(null);
  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"enhanced" | "forecast" | "scenarios" | "goals" | "risks" | "optimization">("enhanced");
  
  // Сценарии
  const [selectedScenario, setSelectedScenario] = useState<WhatIfScenario | null>(null);
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);

  // Устанавливаем флаг после монтирования на клиенте
  useEffect(() => {
    setMounted(true);
  }, []);

  const predefinedScenarios: WhatIfScenario[] = [
    {
      name: "Повышение зарплаты",
      description: "Если зарплата вырастет на 20%",
      monthly_change: 3000000, // 30k рублей в копейках
      affects: "income",
    },
    {
      name: "Отказ от кафе",
      description: "Перестать покупать кофе и обеды вне дома",
      monthly_change: -1000000, // -10k
      affects: "expense",
      category: "Кафе и рестораны",
    },
    {
      name: "Переезд в другой город",
      description: "Снижение арендной платы на 30%",
      monthly_change: -1500000, // -15k
      affects: "expense",
      category: "Жилье",
    },
    {
      name: "Покупка авто",
      description: "Новые расходы на содержание автомобиля",
      monthly_change: 2000000, // +20k
      affects: "expense",
      category: "Транспорт",
    },
  ];

  useEffect(() => {
    fetchForecast();
  }, []);

  async function fetchForecast() {
    try {
      const res = await fetch("/api/ai/forecast?type=expense_simple");
      if (res.ok) {
        const data = await res.json();
        setForecast(data.forecast);
        setInsights(data.insights);
      }
    } catch (error) {
      console.error("Failed to fetch forecast:", error);
    } finally {
      setLoading(false);
    }
  }

  async function simulateScenario(scenario: WhatIfScenario) {
    setSelectedScenario(scenario);
    try {
      const res = await fetch(
        `/api/ai/forecast?type=scenario&scenario=${encodeURIComponent(JSON.stringify(scenario))}&months=12`
      );
      if (res.ok) {
        const data = await res.json();
        setScenarioResult(data.scenario_result);
      }
    } catch (error) {
      console.error("Failed to simulate scenario:", error);
    }
  }

  function formatMoney(amount: number) {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  }

  function getTrendIcon(trend: string) {
    switch (trend) {
      case "increasing":
        return "📈";
      case "decreasing":
        return "📉";
      default:
        return "➡️";
    }
  }

  function getTrendText(trend: string) {
    switch (trend) {
      case "increasing":
        return "Расходы растут";
      case "decreasing":
        return "Расходы снижаются";
      default:
        return "Расходы стабильны";
    }
  }

  // Данные для графика сценариев
  const scenarioChartData = scenarioResult ? {
    labels: scenarioResult.timeline.map(t => t.month),
    datasets: [
      {
        label: "С изменением",
        data: scenarioResult.timeline.map(t => t.balance / 100),
        borderColor: "rgb(79, 70, 229)",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        tension: 0.4,
      },
      {
        label: "Без изменения",
        data: scenarioResult.timeline.map((_, i) => 
          (scenarioResult.original_balance * (i + 1)) / 100
        ),
        borderColor: "rgb(156, 163, 175)",
        backgroundColor: "rgba(156, 163, 175, 0.1)",
        borderDash: [5, 5],
        tension: 0.4,
      },
    ],
  } : null;

  // Показываем загрузку до монтирования на клиенте (избегаем hydration mismatch)
  if (!mounted) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Финансовые прогнозы</h1>
          <p className={styles.subtitle}>AI анализ и сценарии &quot;Что если?&quot;</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={activeTab === "enhanced" ? styles.active : ""}
          onClick={() => setActiveTab("enhanced")}
        >
          🔮 Улучшенный прогноз
        </button>
        <button
          className={activeTab === "forecast" ? styles.active : ""}
          onClick={() => setActiveTab("forecast")}
        >
          📊 Простой прогноз
        </button>
        <button
          className={activeTab === "scenarios" ? styles.active : ""}
          onClick={() => setActiveTab("scenarios")}
        >
          🎯 Сценарии &quot;Что если?&quot;
        </button>
        <button
          className={activeTab === "goals" ? styles.active : ""}
          onClick={() => setActiveTab("goals")}
        >
          🎯 Прогноз целей
        </button>
        <button
          className={activeTab === "risks" ? styles.active : ""}
          onClick={() => setActiveTab("risks")}
        >
          ⚠️ Риски перерасхода
        </button>
        <button
          className={activeTab === "optimization" ? styles.active : ""}
          onClick={() => setActiveTab("optimization")}
        >
          💡 Оптимизация
        </button>
      </div>

      {activeTab === "enhanced" && <EnhancedForecastView />}

      {activeTab === "goals" && <GoalForecastView />}

      {activeTab === "risks" && <SpendingAlertsView />}

      {activeTab === "optimization" && <OptimizationView />}

      {activeTab === "forecast" && (
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Анализируем ваши финансы...</div>
          ) : !forecast ? (
            <div className={styles.error}>
              <div className={styles.errorIcon}>📊</div>
              <h2>Недостаточно данных</h2>
              <p>Для создания прогноза необходимо минимум 2 месяца транзакций</p>
            </div>
          ) : (
            <div className={styles.forecastCard}>
              <div className={styles.forecastHeader}>
                <h2>Прогноз на {forecast.month}</h2>
                <div className={styles.confidence}>
                  Уверенность: {forecast.confidence}%
                </div>
              </div>

              <div className={styles.forecastAmount}>
                {formatMoney(forecast.predicted_expense)}
                <span className={styles.trend}>
                  {getTrendIcon(forecast.trend)} {getTrendText(forecast.trend)}
                </span>
              </div>

              {insights && (
                <div className={styles.insights}>
                  <div className={styles.insightsIcon}>💡</div>
                  <div className={styles.insightsText}>{insights}</div>
                </div>
              )}

              <div className={styles.factors}>
                <h3>Факторы влияния:</h3>
                <ul>
                  {forecast.factors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "scenarios" && (
        <div className={styles.content}>
          <div className={styles.scenariosGrid}>
            <div className={styles.scenariosList}>
              <h3>Готовые сценарии</h3>
              {predefinedScenarios.map((scenario, idx) => (
                <button
                  key={idx}
                  className={`${styles.scenarioCard} ${
                    selectedScenario?.name === scenario.name ? styles.selected : ""
                  }`}
                  onClick={() => simulateScenario(scenario)}
                >
                  <div className={styles.scenarioName}>{scenario.name}</div>
                  <div className={styles.scenarioDesc}>{scenario.description}</div>
                  <div
                    className={`${styles.scenarioChange} ${
                      scenario.monthly_change > 0 && scenario.affects === "income"
                        ? styles.positive
                        : scenario.monthly_change < 0 && scenario.affects === "expense"
                        ? styles.positive
                        : styles.negative
                    }`}
                  >
                    {scenario.monthly_change > 0 ? "+" : ""}
                    {formatMoney(Math.abs(scenario.monthly_change))}/мес
                  </div>
                </button>
              ))}

              <div className={styles.customScenario}>
                <h3>Создать свой сценарий</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const customScenario: WhatIfScenario = {
                      name: formData.get("name") as string,
                      description: formData.get("description") as string,
                      monthly_change: Number(formData.get("amount")) * 100,
                      affects: formData.get("type") as "income" | "expense",
                    };
                    simulateScenario(customScenario);
                    e.currentTarget.reset();
                  }}
                  className={styles.customForm}
                >
                  <div className={styles.formGroup}>
                    <label>Название сценария</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Например: Фриланс"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Описание</label>
                    <input
                      type="text"
                      name="description"
                      placeholder="Дополнительный доход от проектов"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Тип</label>
                    <select name="type" required>
                      <option value="income">Доход</option>
                      <option value="expense">Расход</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Сумма в месяц (₽)</label>
                    <input
                      type="number"
                      name="amount"
                      placeholder="10000"
                      min="0"
                      step="100"
                      required
                    />
                  </div>
                  <button type="submit" className={styles.simulateBtn}>
                    🎯 Симулировать
                  </button>
                </form>
              </div>
            </div>

            {scenarioResult && (
              <div className={styles.scenarioResult}>
                <h3>Результат симуляции</h3>
                
                <div className={styles.impactSummary}>
                  <div className={styles.impactItem}>
                    <div className={styles.impactLabel}>Текущий баланс</div>
                    <div className={styles.impactValue}>
                      {formatMoney(scenarioResult.original_balance)}/мес
                    </div>
                  </div>
                  <div className={styles.arrow}>→</div>
                  <div className={styles.impactItem}>
                    <div className={styles.impactLabel}>Новый баланс</div>
                    <div className={`${styles.impactValue} ${
                      scenarioResult.new_balance > scenarioResult.original_balance
                        ? styles.positive
                        : styles.negative
                    }`}>
                      {formatMoney(scenarioResult.new_balance)}/мес
                    </div>
                  </div>
                </div>

                <div className={styles.difference}>
                  <strong>Изменение:</strong>{" "}
                  {scenarioResult.difference > 0 ? "+" : ""}
                  {formatMoney(scenarioResult.difference)}/мес
                  <span className={styles.percentage}>
                    ({(scenarioResult.impact_percentage || 0) > 0 ? "+" : ""}
                    {(scenarioResult.impact_percentage || 0).toFixed(1)}%)
                  </span>
                </div>

                <div className={styles.recommendation}>
                  <strong>💡 Рекомендация:</strong>
                  <p>{scenarioResult.recommendation}</p>
                </div>

                {scenarioChartData && (
                  <div className={styles.chart}>
                    <h4>Прогноз на 12 месяцев</h4>
                    <Line
                      data={scenarioChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "top",
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: (value) => `${value} ₽`,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
