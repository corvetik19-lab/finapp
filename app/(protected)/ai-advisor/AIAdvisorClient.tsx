"use client";

import { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import styles from "./AIAdvisor.module.css";
import type { FinancialHealthReport } from "@/lib/analytics/financial-health";
import { getScoreColor, getGradeLabel } from "@/lib/analytics/financial-health";

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
  expected_result?: string;
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
  const [healthReport, setHealthReport] = useState<FinancialHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    try {
      // Загружаем данные советника и финансового здоровья параллельно
      const [advisorRes, healthRes] = await Promise.all([
        fetch("/api/ai/advisor"),
        fetch("/api/analytics/financial-health"),
      ]);

      if (advisorRes.ok) {
        const advisorData = await advisorRes.json();
        setData(advisorData);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealthReport(healthData.report);
      }

      if (!advisorRes.ok && !healthRes.ok) {
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

  function getTypeIcon(type: string) {
    switch (type) {
      case "optimization":
        return "📊";
      case "warning":
        return "⚠️";
      case "opportunity":
        return "🎯";
      case "goal":
        return "🏆";
      case "automation":
        return "⚙️";
      default:
        return "💡";
    }
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case "optimization":
        return "Оптимизация";
      case "warning":
        return "Предупреждение";
      case "opportunity":
        return "Возможность";
      case "goal":
        return "Цель";
      case "automation":
        return "Автоматизация";
      default:
        return "Совет";
    }
  }

  function getPriorityColor(priority: number) {
    if (priority <= 2) return "#ef4444"; // Высокий - красный
    if (priority <= 3) return "#f59e0b"; // Средний - оранжевый
    return "#10b981"; // Низкий - зелёный
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

      {/* Финансовое здоровье - улучшенная версия */}
      {healthReport && (
        <div className={styles.healthCard}>
          <div className={styles.healthHeader}>
            <h2>💊 Ваше финансовое здоровье</h2>
            <div
              className={styles.grade}
              style={{ backgroundColor: getScoreColor(healthReport.overall_score) }}
            >
              {getGradeLabel(healthReport.grade)}
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
                stroke={getScoreColor(healthReport.overall_score)}
                strokeWidth="20"
                strokeDasharray={`${healthReport.overall_score * 5.03} 503`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div className={styles.scoreValue}>{healthReport.overall_score}</div>
            <div className={styles.scoreLabel}>из 100</div>
          </div>

          <div className={styles.breakdown}>
            <h3>Детализация по категориям:</h3>
            <div className={styles.breakdownGrid}>
              {Object.entries(healthReport.categories).map(([key, category]) => (
                <div key={key} className={styles.breakdownItem}>
                  <div className={styles.breakdownLabel}>
                    {key === "savings"
                      ? "💰 Сбережения"
                      : key === "budget"
                      ? "📊 Бюджет"
                      : key === "debt"
                      ? "💳 Долги"
                      : "📈 Стабильность"}
                  </div>
                  <div className={styles.breakdownBar}>
                    <div
                      className={styles.breakdownProgress}
                      style={{
                        width: `${category.score}%`,
                        backgroundColor: getScoreColor(category.score),
                      }}
                    />
                  </div>
                  <div className={styles.breakdownValue}>{category.score}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Ключевые выводы */}
          {healthReport.insights && healthReport.insights.length > 0 && (
            <div className={styles.insights}>
              <h3>📊 Ключевые выводы:</h3>
              <div className={styles.insightsList}>
                {healthReport.insights.map((insight, idx) => (
                  <div key={idx} className={styles.insightItem}>
                    • {insight}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Рекомендации по улучшению */}
          {healthReport.recommendations && healthReport.recommendations.length > 0 && (
            <div className={styles.recommendations}>
              <h3>💡 Рекомендации по улучшению:</h3>
              <div className={styles.recommendationsList}>
                {healthReport.recommendations.slice(0, 3).map((rec, idx) => (
                  <div key={idx} className={styles.recommendationItem}>
                    <div className={styles.recHeader}>
                      <span className={styles.recPriority}>
                        {rec.priority === "high" ? "🔥" : rec.priority === "medium" ? "⚡" : "💡"}
                      </span>
                      <strong>{rec.title}</strong>
                    </div>
                    <p>{rec.description}</p>
                    {rec.impact && (
                      <div className={styles.recImpact}>
                        Потенциальное улучшение: <strong>+{rec.impact} баллов</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Старый вариант - показываем если нет healthReport */}
      {!healthReport && data && (
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
      )}

      {/* Денежные утечки */}
      {data.money_leaks.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>💸 Денежные утечки</h2>
              <p className={styles.sectionDesc}>
                Категории где вы тратите больше рекомендуемого. Регулярные мелкие траты могут создавать значительную утечку бюджета.
              </p>
            </div>
            <div className={styles.totalSavingsPotential}>
              <div className={styles.totalSavingsLabel}>Потенциальная экономия:</div>
              <div className={styles.totalSavingsAmount}>
                {formatMoney(data.money_leaks.reduce((sum, l) => sum + l.potential_savings, 0))}/мес
              </div>
              <div className={styles.totalSavingsYear}>
                {formatMoney(data.money_leaks.reduce((sum, l) => sum + l.potential_savings, 0) * 12)}/год
              </div>
            </div>
          </div>
          
          <div className={styles.leaksGrid}>
            {data.money_leaks.map((leak, idx) => {
              const yearlyWaste = leak.amount * 12;
              const yearlySavings = leak.potential_savings * 12;
              const savingsPercentage = leak.amount > 0 ? (leak.potential_savings / leak.amount * 100) : 0;
              
              return (
                <div key={idx} className={styles.leakCard}>
                  <div className={styles.leakHeader}>
                    <div className={styles.leakRank}>#{idx + 1}</div>
                    <div className={styles.leakCategory}>
                      <span className={styles.leakCategoryIcon}>💰</span>
                      {leak.category}
                    </div>
                    <div className={styles.leakPercentage}>
                      {leak.percentage_of_income.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className={styles.leakStats}>
                    <div className={styles.leakStat}>
                      <span className={styles.leakStatLabel}>Тратится:</span>
                      <span className={styles.leakStatValue}>{formatMoney(leak.amount)}/мес</span>
                    </div>
                    <div className={styles.leakStat}>
                      <span className={styles.leakStatLabel}>За год:</span>
                      <span className={styles.leakStatValue}>{formatMoney(yearlyWaste)}</span>
                    </div>
                  </div>

                  <div className={styles.leakSavingsBox}>
                    <div className={styles.leakSavingsHeader}>
                      <span>💡 Можно сэкономить</span>
                      <span className={styles.leakSavingsPercent}>до {savingsPercentage.toFixed(0)}%</span>
                    </div>
                    <div className={styles.leakSavingsAmount}>
                      <div className={styles.leakSavingsMonthly}>
                        <strong>{formatMoney(leak.potential_savings)}</strong>/мес
                      </div>
                      <div className={styles.leakSavingsYearly}>
                        = <strong>{formatMoney(yearlySavings)}</strong>/год
                      </div>
                    </div>
                  </div>

                  <div className={styles.leakRecommendation}>
                    <span className={styles.leakRecommendationIcon}>💬</span>
                    {leak.recommendation}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Совет по утечкам */}
          <div className={styles.leaksTip}>
            <div className={styles.leaksTipIcon}>💡</div>
            <div className={styles.leaksTipContent}>
              <strong>Совет:</strong> Начните с категории #{1} — она даёт максимальную экономию. 
              Даже сокращение на 30% может высвободить {formatMoney(data.money_leaks[0].potential_savings * 0.3)}/мес 
              = {formatMoney(data.money_leaks[0].potential_savings * 0.3 * 12)}/год!
            </div>
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
          <h2 className={styles.sectionTitle}>💡 Персональные рекомендации (Топ-5)</h2>
          <div className={styles.adviceGrid}>
            {data.advice
              .sort((a, b) => a.priority - b.priority) // Сортируем по приоритету (1 = самый важный)
              .map((advice, idx) => (
                <div key={idx} className={styles.adviceCard} style={{
                  borderLeft: `4px solid ${getPriorityColor(advice.priority)}`
                }}>
                  <div className={styles.adviceHeader}>
                    <div className={styles.adviceHeaderLeft}>
                      <span className={styles.adviceTypeIcon}>{getTypeIcon(advice.type)}</span>
                      <span className={styles.adviceTypeBadge} style={{
                        background: `${getPriorityColor(advice.priority)}15`,
                        color: getPriorityColor(advice.priority),
                        border: `1px solid ${getPriorityColor(advice.priority)}30`
                      }}>
                        {getTypeLabel(advice.type)}
                      </span>
                    </div>
                    <div className={styles.advicePriority} style={{
                      background: getPriorityColor(advice.priority),
                      color: "#fff"
                    }}>
                      #{advice.priority}
                    </div>
                  </div>
                  <h3 className={styles.adviceTitle}>
                    <span className={styles.adviceImpact}>{getImpactIcon(advice.impact)}</span>
                    {advice.title}
                  </h3>
                  <p className={styles.adviceDesc}>{advice.description}</p>
                  
                  {advice.action_items && advice.action_items.length > 0 && (
                    <div className={styles.actionItems}>
                      <strong>🎯 План действий:</strong>
                      <ul>
                        {advice.action_items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {advice.expected_result && (
                    <div className={styles.expectedResult}>
                      <strong>✨ Ожидаемый результат:</strong> {advice.expected_result}
                    </div>
                  )}
                  
                  <div className={styles.adviceMeta}>
                    <span className={styles.adviceImpactLabel}>
                      Влияние: <strong>{advice.impact === "high" ? "Высокое" : advice.impact === "medium" ? "Среднее" : "Низкое"}</strong>
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* План действий */}
      {data.action_plan.steps.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>🎯 Пошаговый план достижения целей</h2>
              <p className={styles.sectionDesc}>
                Рекомендуемая последовательность действий для достижения финансовых целей
              </p>
            </div>
            <a href="/plans" className={styles.createPlanButton}>
              📝 Создать план
            </a>
          </div>
          
          <div className={styles.actionPlanSummary}>
            <div className={styles.planStat}>
              <span className={styles.planStatLabel}>Всего шагов:</span>
              <span className={styles.planStatValue}>{data.action_plan.steps.length}</span>
            </div>
            <div className={styles.planStat}>
              <span className={styles.planStatLabel}>Общее время:</span>
              <span className={styles.planStatValue}>{data.action_plan.total_months} мес</span>
            </div>
            <div className={styles.planStat}>
              <span className={styles.planStatLabel}>До завершения:</span>
              <span className={styles.planStatValue}>
                {new Date(Date.now() + data.action_plan.total_months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className={styles.timeline}>
            {data.action_plan.steps.map((step, idx) => {
              // Простая логика: первый шаг считаем "в процессе"
              const status = idx === 0 ? 'current' : 'pending';
              const cumulativeMonths = data.action_plan.steps
                .slice(0, idx)
                .reduce((sum, s) => sum + s.duration_months, 0);
              
              return (
                <div 
                  key={step.step} 
                  className={`${styles.timelineItem} ${status === 'current' ? styles.timelineItemCurrent : ''}`}
                >
                  <div className={styles.timelineMarker}>
                    <div className={`${styles.timelineNumber} ${status === 'current' ? styles.timelineNumberCurrent : ''}`}>
                      {status === 'current' ? '⏳' : step.step}
                    </div>
                    {idx < data.action_plan.steps.length - 1 && (
                      <div className={styles.timelineLine}></div>
                    )}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <h3>{step.title}</h3>
                      {status === 'current' && (
                        <span className={styles.currentBadge}>Текущий этап</span>
                      )}
                    </div>
                    <p>{step.description}</p>
                    <div className={styles.timelineMeta}>
                      <div className={styles.timelineDuration}>
                        <span className={styles.timelineDurationIcon}>⏱️</span>
                        <span>Длительность: <strong>{step.duration_months} мес</strong></span>
                      </div>
                      <div className={styles.timelineStart}>
                        <span className={styles.timelineStartIcon}>📅</span>
                        <span>Начало: <strong>
                          {new Date(Date.now() + cumulativeMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}
                        </strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.planFooter}>
            <div className={styles.planProgress}>
              <div className={styles.planProgressBar}>
                <div className={styles.planProgressFill} style={{ width: '0%' }}></div>
              </div>
              <span className={styles.planProgressText}>Прогресс: 0% (0 из {data.action_plan.steps.length} шагов)</span>
            </div>
            <p className={styles.planTip}>
              💡 <strong>Совет:</strong> Используйте раздел <a href="/plans">&quot;Планы&quot;</a> для создания конкретных финансовых целей и отслеживания прогресса.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
