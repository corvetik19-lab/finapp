"use client";

import { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
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
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Анализируем ваши финансы...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-xl font-semibold mb-2">Ошибка загрузки</h2>
          <p className="text-muted-foreground">{error || "Не удалось получить данные советника"}</p>
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">🧠 AI Финансовый Советник</h1>
        <p className="text-muted-foreground">
          Персональный анализ и рекомендации на основе ваших данных
        </p>
      </div>

      {/* Финансовое здоровье - улучшенная версия */}
      {healthReport && (
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">💊 Ваше финансовое здоровье</h2>
            <Badge style={{ backgroundColor: getScoreColor(healthReport.overall_score) }} className="text-white">
              {getGradeLabel(healthReport.grade)}
            </Badge>
          </div>

          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg viewBox="0 0 200 200" className="w-full h-full">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold">{healthReport.overall_score}</div>
              <div className="text-sm text-muted-foreground">из 100</div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Детализация по категориям:</h3>
            <div className="grid gap-3">
              {Object.entries(healthReport.categories).map(([key, category]) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-32 text-sm">
                    {key === "savings"
                      ? "💰 Сбережения"
                      : key === "budget"
                      ? "📊 Бюджет"
                      : key === "debt"
                      ? "💳 Долги"
                      : "📈 Стабильность"}
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${category.score}%`,
                        backgroundColor: getScoreColor(category.score),
                      }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm font-medium">{category.score}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Ключевые выводы */}
          {healthReport.insights && healthReport.insights.length > 0 && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">📊 Ключевые выводы:</h3>
              <div className="space-y-1 text-sm">
                {healthReport.insights.map((insight, idx) => (
                  <div key={idx} className="text-muted-foreground">
                    • {insight}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Рекомендации по улучшению */}
          {healthReport.recommendations && healthReport.recommendations.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-3">💡 Рекомендации по улучшению:</h3>
              <div className="space-y-3">
                {healthReport.recommendations.slice(0, 3).map((rec, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span>
                        {rec.priority === "high" ? "🔥" : rec.priority === "medium" ? "⚡" : "💡"}
                      </span>
                      <strong className="text-sm">{rec.title}</strong>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    {rec.impact && (
                      <div className="text-xs text-green-600 mt-1">
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
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Ваше финансовое здоровье</h2>
            <Badge style={{ backgroundColor: getGradeColor(data.health_score.grade) }} className="text-white">
              {getGradeText(data.health_score.grade)}
            </Badge>
          </div>

          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="20" />
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
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold">{data.health_score.overall_score}</div>
              <div className="text-sm text-muted-foreground">из 100</div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Детализация:</h3>
            <div className="grid gap-3">
              {Object.entries(data.health_score.breakdown).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-40 text-sm">
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
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${value}%`,
                        backgroundColor: value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm font-medium">{value}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Денежные утечки */}
      {data.money_leaks.length > 0 && (
        <div className="bg-card rounded-lg border p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold">💸 Денежные утечки</h2>
              <p className="text-sm text-muted-foreground">
                Категории где вы тратите больше рекомендуемого
              </p>
            </div>
            <div className="text-right bg-green-50 p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Потенциальная экономия:</div>
              <div className="text-lg font-bold text-green-600">
                {formatMoney(data.money_leaks.reduce((sum, l) => sum + l.potential_savings, 0))}/мес
              </div>
              <div className="text-sm text-green-600">
                {formatMoney(data.money_leaks.reduce((sum, l) => sum + l.potential_savings, 0) * 12)}/год
              </div>
            </div>
          </div>
          
          <div className="grid gap-4">
            {data.money_leaks.map((leak, idx) => {
              const yearlyWaste = leak.amount * 12;
              const yearlySavings = leak.potential_savings * 12;
              const savingsPercentage = leak.amount > 0 ? (leak.potential_savings / leak.amount * 100) : 0;
              
              return (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">#{idx + 1}</span>
                      <span className="font-medium">💰 {leak.category}</span>
                    </div>
                    <Badge variant="secondary">{leak.percentage_of_income.toFixed(1)}%</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Тратится:</span>
                      <span className="ml-1 font-medium">{formatMoney(leak.amount)}/мес</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">За год:</span>
                      <span className="ml-1 font-medium">{formatMoney(yearlyWaste)}</span>
                    </div>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>💡 Можно сэкономить</span>
                      <span className="text-green-600 font-medium">до {savingsPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="flex gap-2 text-green-700">
                      <span><strong>{formatMoney(leak.potential_savings)}</strong>/мес</span>
                      <span>= <strong>{formatMoney(yearlySavings)}</strong>/год</span>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground flex gap-2">
                    <span>💬</span>
                    {leak.recommendation}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Совет по утечкам */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg flex gap-3">
            <span className="text-xl">💡</span>
            <div className="text-sm">
              <strong>Совет:</strong> Начните с категории #1 — она даёт максимальную экономию. 
              Даже сокращение на 30% может высвободить {formatMoney(data.money_leaks[0].potential_savings * 0.3)}/мес 
              = {formatMoney(data.money_leaks[0].potential_savings * 0.3 * 12)}/год!
            </div>
          </div>
        </div>
      )}

      {/* Идеальный бюджет */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-1">📊 Сравнение с идеальным бюджетом</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Правило 50/30/20: потребности, желания, сбережения
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="text-center">
            <h3 className="font-medium mb-2">Идеальный</h3>
            <div className="h-48">
              <Doughnut
                data={budgetChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 10, font: { size: 12 } } } },
                }}
              />
            </div>
          </div>
          <div className="text-center">
            <h3 className="font-medium mb-2">Ваш бюджет</h3>
            <div className="h-48">
              <Doughnut
                data={userBudgetChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 10, font: { size: 12 } } } },
                }}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-1 text-sm text-muted-foreground">
          {data.ideal_budget.recommendations.map((rec, idx) => (
            <div key={idx}>• {rec}</div>
          ))}
        </div>
      </div>

      {/* AI Советы */}
      {data.advice.length > 0 && (
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">💡 Персональные рекомендации (Топ-5)</h2>
          <div className="space-y-4">
            {data.advice
              .sort((a, b) => a.priority - b.priority)
              .map((advice, idx) => (
                <div key={idx} className="border rounded-lg p-4" style={{ borderLeft: `4px solid ${getPriorityColor(advice.priority)}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getTypeIcon(advice.type)}</span>
                      <Badge variant="outline" style={{ borderColor: getPriorityColor(advice.priority), color: getPriorityColor(advice.priority) }}>
                        {getTypeLabel(advice.type)}
                      </Badge>
                    </div>
                    <Badge style={{ backgroundColor: getPriorityColor(advice.priority) }} className="text-white">
                      #{advice.priority}
                    </Badge>
                  </div>
                  <h3 className="font-semibold mb-1">
                    <span className="mr-1">{getImpactIcon(advice.impact)}</span>
                    {advice.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">{advice.description}</p>
                  
                  {advice.action_items && advice.action_items.length > 0 && (
                    <div className="text-sm mb-2">
                      <strong>🎯 План действий:</strong>
                      <ul className="list-disc list-inside mt-1 text-muted-foreground">
                        {advice.action_items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {advice.expected_result && (
                    <div className="text-sm text-green-600">
                      <strong>✨ Ожидаемый результат:</strong> {advice.expected_result}
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    Влияние: <strong>{advice.impact === "high" ? "Высокое" : advice.impact === "medium" ? "Среднее" : "Низкое"}</strong>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* План действий */}
      {data.action_plan.steps.length > 0 && (
        <div className="bg-card rounded-lg border p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold">🎯 Пошаговый план достижения целей</h2>
              <p className="text-sm text-muted-foreground">
                Рекомендуемая последовательность действий для достижения финансовых целей
              </p>
            </div>
            <Button asChild variant="outline">
              <a href="/plans">📝 Создать план</a>
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Всего шагов:</div>
              <div className="font-semibold">{data.action_plan.steps.length}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Общее время:</div>
              <div className="font-semibold">{data.action_plan.total_months} мес</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">До завершения:</div>
              <div className="font-semibold">
                {new Date(Date.now() + data.action_plan.total_months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {data.action_plan.steps.map((step, idx) => {
              const status = idx === 0 ? 'current' : 'pending';
              const cumulativeMonths = data.action_plan.steps.slice(0, idx).reduce((sum, s) => sum + s.duration_months, 0);
              
              return (
                <div key={step.step} className={cn("flex gap-4", status === 'current' && "bg-blue-50 p-3 rounded-lg")}>
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      status === 'current' ? "bg-blue-500 text-white" : "bg-gray-200"
                    )}>
                      {status === 'current' ? '⏳' : step.step}
                    </div>
                    {idx < data.action_plan.steps.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{step.title}</h3>
                      {status === 'current' && (
                        <Badge className="bg-blue-500">Текущий этап</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>⏱️ Длительность: <strong>{step.duration_months} мес</strong></span>
                      <span>📅 Начало: <strong>
                        {new Date(Date.now() + cumulativeMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })}
                      </strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="mb-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '0%' }}></div>
              </div>
              <span className="text-xs text-muted-foreground">Прогресс: 0% (0 из {data.action_plan.steps.length} шагов)</span>
            </div>
            <p className="text-sm text-muted-foreground">
              💡 <strong>Совет:</strong> Используйте раздел <a href="/plans" className="text-blue-500 hover:underline">&quot;Планы&quot;</a> для создания конкретных финансовых целей и отслеживания прогресса.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
