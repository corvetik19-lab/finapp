"use client";

import { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import styles from "./AIAdvisor.module.css";

// Регистрируем компоненты Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

interface HealthScore {
  overall_score: number;
  breakdown: {
    savings_rate: number;
    expense_stability: number;
    budget_adherence: number;
    debt_management: number;
    emergency_fund: number;
  };
  grade: string;
}

interface MoneyLeak {
  category: string;
  amount: number;
  percentage_of_income: number;
  recommendation: string;
  potential_savings: number;
}

interface Advice {
  type: string;
  title: string;
  description: string;
  action_items: string[];
  impact: string;
  priority: number;
}

interface AdvisorData {
  health_score: HealthScore;
  money_leaks: MoneyLeak[];
  ideal_budget: {
    needs: number;
    wants: number;
    savings: number;
    user_actual: {
      needs: number;
      wants: number;
      savings: number;
    };
    recommendations: string[];
  };
  advice: Advice[];
  action_plan: {
    steps: { step: number; title: string; description: string; duration_months: number }[];
    total_months: number;
  };
  stats: {
    monthly_income: number;
    monthly_expense: number;
    monthly_savings: number;
    emergency_fund: number;
  };
}

export default function AIAdvisorClient() {
  const [data, setData] = useState<AdvisorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdvisorData();
  }, []);

  async function fetchAdvisorData() {
    try {
      const res = await fetch("/api/ai/advisor");
      if (res.ok) {
        const advisorData = await res.json();
        setData(advisorData);
      } else {
        setError("Не удалось загрузить данные");
      }
    } catch {
      setError("Ошибка подключения");
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(amount: number) {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  }

  function getGradeColor(grade: string) {
    switch (grade) {
      case "Excellent":
        return "#10b981";
      case "Good":
        return "#3b82f6";
      case "Fair":
        return "#f59e0b";
      case "Poor":
        return "#ef4444";
      default:
        return "#dc2626";
    }
  }

  function getGradeText(grade: string) {
    switch (grade) {
      case "Excellent":
        return "Отлично";
      case "Good":
        return "Хорошо";
      case "Fair":
        return "Удовлетворительно";
      case "Poor":
        return "Плохо";
      default:
        return "Критично";
    }
  }

  function getImpactIcon(impact: string) {
    switch (impact) {
      case "high":
        return "🔥";
      case "medium":
        return "⚡";
      default:
        return "💡";
    }
  }

  if (loading) {
    return <div className={styles.loading}>Анализируем ваши финансы...</div>;
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <div className={styles.errorIcon}>🤖</div>
          <h2>Ошибка загрузки</h2>
          <p>{error || "Не удалось получить данные советника"}</p>
        </div>
      </div>
    );
  }

  // Данные для графика идеального бюджета
  const budgetChartData = {
    labels: ["Потребности", "Желания", "Сбережения"],
    datasets: [
      {
        label: "Идеальный бюджет",
        data: [
          data.ideal_budget.needs,
          data.ideal_budget.wants,
          data.ideal_budget.savings,
        ],
        backgroundColor: ["#3b82f6", "#8b5cf6", "#10b981"],
        borderWidth: 0,
      },
    ],
  };

  const userBudgetChartData = {
    labels: ["Потребности", "Желания", "Сбережения"],
    datasets: [
      {
        label: "Ваш бюджет",
        data: [
          data.ideal_budget.user_actual.needs,
          data.ideal_budget.user_actual.wants,
          data.ideal_budget.user_actual.savings,
        ],
        backgroundColor: ["#3b82f6", "#8b5cf6", "#10b981"],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>🧠 AI Финансовый Советник</h1>
        <p className={styles.subtitle}>
          Персональный анализ и рекомендации на основе ваших данных
        </p>
      </div>

      {/* Финансовое здоровье */}
      <div className={styles.healthCard}>
        <div className={styles.healthHeader}>
          <h2>Ваше финансовое здоровье</h2>
          <div
            className={styles.grade}
            style={{ backgroundColor: getGradeColor(data.health_score.grade) }}
          >
            {getGradeText(data.health_score.grade)}
          </div>
        </div>

        <div className={styles.scoreCircle}>
          <svg viewBox="0 0 200 200" className={styles.scoreSvg}>
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="20"
            />
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke={getGradeColor(data.health_score.grade)}
              strokeWidth="20"
              strokeDasharray={`${data.health_score.overall_score * 5.03} 503`}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className={styles.scoreValue}>{data.health_score.overall_score}</div>
          <div className={styles.scoreLabel}>из 100</div>
        </div>

        <div className={styles.breakdown}>
          <h3>Детализация:</h3>
          <div className={styles.breakdownGrid}>
            {Object.entries(data.health_score.breakdown).map(([key, value]) => (
              <div key={key} className={styles.breakdownItem}>
                <div className={styles.breakdownLabel}>
                  {key === "savings_rate"
                    ? "Норма сбережений"
                    : key === "expense_stability"
                    ? "Стабильность расходов"
                    : key === "budget_adherence"
                    ? "Соблюдение бюджета"
                    : key === "debt_management"
                    ? "Управление долгами"
                    : "Аварийный фонд"}
                </div>
                <div className={styles.breakdownBar}>
                  <div
                    className={styles.breakdownProgress}
                    style={{
                      width: `${value}%`,
                      backgroundColor:
                        value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#ef4444",
                    }}
                  />
                </div>
                <div className={styles.breakdownValue}>{value}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Денежные утечки */}
      {data.money_leaks.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>💸 Денежные утечки</h2>
          <p className={styles.sectionDesc}>
            Категории где вы тратите больше рекомендуемого
          </p>
          <div className={styles.leaksGrid}>
            {data.money_leaks.map((leak, idx) => (
              <div key={idx} className={styles.leakCard}>
                <div className={styles.leakHeader}>
                  <div className={styles.leakCategory}>{leak.category}</div>
                  <div className={styles.leakPercentage}>
                    {leak.percentage_of_income.toFixed(1)}% дохода
                  </div>
                </div>
                <div className={styles.leakAmount}>
                  Тратится: {formatMoney(leak.amount)}/мес
                </div>
                <div className={styles.leakSavings}>
                  Можно сэкономить: <strong>{formatMoney(leak.potential_savings)}</strong>
                </div>
                <div className={styles.leakRecommendation}>{leak.recommendation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Идеальный бюджет */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📊 Сравнение с идеальным бюджетом</h2>
        <p className={styles.sectionDesc}>
          Правило 50/30/20: потребности, желания, сбережения
        </p>
        <div className={styles.budgetComparison}>
          <div className={styles.budgetChart}>
            <h3>Идеальный</h3>
            <div className={styles.budgetChartContainer}>
              <Doughnut
                data={budgetChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { 
                      position: "bottom",
                      labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: { size: 12 }
                      }
                    },
                  },
                }}
              />
            </div>
          </div>
          <div className={styles.budgetChart}>
            <h3>Ваш бюджет</h3>
            <div className={styles.budgetChartContainer}>
              <Doughnut
                data={userBudgetChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { 
                      position: "bottom",
                      labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: { size: 12 }
                      }
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
        <div className={styles.budgetRecommendations}>
          {data.ideal_budget.recommendations.map((rec, idx) => (
            <div key={idx} className={styles.budgetRec}>
              • {rec}
            </div>
          ))}
        </div>
      </div>

      {/* AI Советы */}
      {data.advice.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>💡 Персональные рекомендации</h2>
          <div className={styles.adviceGrid}>
            {data.advice
              .sort((a, b) => b.priority - a.priority)
              .map((advice, idx) => (
                <div key={idx} className={styles.adviceCard}>
                  <div className={styles.adviceHeader}>
                    <span className={styles.adviceImpact}>
                      {getImpactIcon(advice.impact)}
                    </span>
                    <h3>{advice.title}</h3>
                  </div>
                  <p className={styles.adviceDesc}>{advice.description}</p>
                  {advice.action_items.length > 0 && (
                    <div className={styles.actionItems}>
                      <strong>Что делать:</strong>
                      <ul>
                        {advice.action_items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className={styles.adviceMeta}>
                    Приоритет: {advice.priority}/10
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* План действий */}
      {data.action_plan.steps.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🎯 Пошаговый план достижения целей</h2>
          <div className={styles.timeline}>
            {data.action_plan.steps.map((step) => (
              <div key={step.step} className={styles.timelineItem}>
                <div className={styles.timelineNumber}>{step.step}</div>
                <div className={styles.timelineContent}>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <div className={styles.timelineDuration}>
                    ⏱️ {step.duration_months} мес
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.totalTime}>
            <strong>Общее время:</strong> {data.action_plan.total_months} месяцев
          </div>
        </div>
      )}
    </div>
  );
}
