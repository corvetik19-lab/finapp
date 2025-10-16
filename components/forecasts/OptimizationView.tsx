"use client";

import { useEffect, useState } from "react";
import styles from "./Forecasts.module.css";
import {
  type OptimizationReport,
  getPriorityColor,
  getImpactColor,
} from "@/lib/ai/optimization-advisor";

export default function OptimizationView() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<OptimizationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    try {
      const res = await fetch("/api/ai/optimization");
      if (!res.ok) {
        throw new Error("Failed to load optimization report");
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error("Error loading optimization:", err);
      setError("Не удалось загрузить рекомендации");
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

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Анализируем возможности экономии...</p>
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

  if (!report || report.opportunities.length === 0) {
    return (
      <div className={styles.noAlerts}>
        <div className={styles.noAlertsIcon}>✅</div>
        <h2>Ваш бюджет оптимален!</h2>
        <p>Мы не нашли значительных возможностей для экономии. Продолжайте контролировать расходы.</p>
      </div>
    );
  }

  return (
    <div className={styles.optimizationView}>
      {/* Общая статистика */}
      <div className={styles.optimizationSummary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>💰</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryLabel}>Потенциальная экономия</div>
            <div className={styles.summaryValue}>{formatMoney(report.total_potential_savings)}</div>
            <div className={styles.summarySubtext}>в месяц</div>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>📊</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryLabel}>Текущие траты</div>
            <div className={styles.summaryValue}>{formatMoney(report.total_monthly_spending)}</div>
            <div className={styles.summarySubtext}>в месяц</div>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>🎯</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryLabel}>Рекомендуемый бюджет</div>
            <div className={styles.summaryValue}>{formatMoney(report.recommended_spending)}</div>
            <div className={styles.summarySubtext}>в месяц</div>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>📉</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryLabel}>Сокращение</div>
            <div className={styles.summaryValue} style={{ color: "#10b981" }}>
              -{report.savings_percentage.toFixed(1)}%
            </div>
            <div className={styles.summarySubtext}>от текущих трат</div>
          </div>
        </div>
      </div>

      {/* Быстрые победы */}
      {report.quick_wins.length > 0 && (
        <div className={styles.quickWinsSection}>
          <h2>⚡ Быстрые победы</h2>
          <p className={styles.sectionSubtitle}>Простые действия, которые дадут результат уже сегодня</p>
          <div className={styles.quickWinsList}>
            {report.quick_wins.map((win, idx) => (
              <div key={idx} className={styles.quickWinCard}>
                <div className={styles.quickWinIcon}>✓</div>
                <div className={styles.quickWinText}>{win}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Топ-3 категории */}
      <div className={styles.top3Section}>
        <h2>🎯 Топ-3 категории для оптимизации</h2>
        <div className={styles.top3Grid}>
          {report.top_3_categories.map((cat, idx) => (
            <div key={cat.category} className={styles.top3Card}>
              <div className={styles.top3Rank}>#{idx + 1}</div>
              <div className={styles.top3Category}>{cat.category}</div>
              <div className={styles.top3Current}>
                <span className={styles.top3Label}>Сейчас:</span>
                <span>{formatMoney(cat.current)}/мес</span>
              </div>
              <div className={styles.top3Savings}>
                <span className={styles.top3Label}>Экономия:</span>
                <span style={{ color: "#10b981", fontWeight: 600 }}>
                  {formatMoney(cat.savings)}/мес
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Возможности оптимизации */}
      <div className={styles.opportunitiesSection}>
        <h2>💡 Возможности оптимизации ({report.opportunities.length})</h2>
        <div className={styles.opportunitiesList}>
          {report.opportunities.map((opp) => (
            <div key={opp.id} className={styles.opportunityCard}>
              <div className={styles.opportunityHeader}>
                <div className={styles.opportunityTitle}>
                  <span className={styles.opportunityCategory}>{opp.category}</span>
                  <span
                    className={styles.opportunityPriority}
                    style={{ backgroundColor: getPriorityColor(opp.priority) }}
                  >
                    {opp.priority === "high"
                      ? "ВЫСОКИЙ"
                      : opp.priority === "medium"
                      ? "СРЕДНИЙ"
                      : "НИЗКИЙ"}
                  </span>
                </div>
                <div className={styles.opportunitySavings}>
                  Экономия: <strong>{formatMoney(opp.potential_savings)}/мес</strong>
                </div>
              </div>

              <div className={styles.opportunityStats}>
                <div className={styles.opportunityStat}>
                  <span className={styles.statLabel}>Тратите сейчас:</span>
                  <span className={styles.statValue}>{formatMoney(opp.current_spending)}</span>
                </div>
                <div className={styles.opportunityStat}>
                  <span className={styles.statLabel}>Рекомендуем:</span>
                  <span className={styles.statValue} style={{ color: "#10b981" }}>
                    {formatMoney(opp.recommended_spending)}
                  </span>
                </div>
                <div className={styles.opportunityStat}>
                  <span className={styles.statLabel}>Сокращение:</span>
                  <span className={styles.statValue} style={{ color: "#f59e0b" }}>
                    -{opp.savings_percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className={styles.opportunityAdvice}>
                <strong>💬 Совет:</strong> {opp.advice}
              </div>

              <div className={styles.opportunityTips}>
                <strong>📋 Конкретные действия:</strong>
                <ul>
                  {opp.specific_tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Денежные утечки */}
      {report.money_leaks.length > 0 && (
        <div className={styles.leaksSection}>
          <h2>🚰 Денежные утечки</h2>
          <p className={styles.sectionSubtitle}>
            Регулярные мелкие траты, которые незаметно &quot;съедают&quot; ваш бюджет
          </p>
          <div className={styles.leaksList}>
            {report.money_leaks.map((leak, idx) => (
              <div key={idx} className={styles.leakCard}>
                <div className={styles.leakHeader}>
                  <div className={styles.leakCategory}>{leak.category}</div>
                  <div
                    className={styles.leakImpact}
                    style={{ backgroundColor: getImpactColor(leak.impact) }}
                  >
                    {leak.impact === "high"
                      ? "ВЫСОКОЕ ВЛИЯНИЕ"
                      : leak.impact === "medium"
                      ? "СРЕДНЕЕ"
                      : "НИЗКОЕ"}
                  </div>
                </div>
                <div className={styles.leakStats}>
                  <div className={styles.leakStat}>
                    <div className={styles.leakStatLabel}>Частота</div>
                    <div className={styles.leakStatValue}>{leak.frequency} раз/мес</div>
                  </div>
                  <div className={styles.leakStat}>
                    <div className={styles.leakStatLabel}>Средний чек</div>
                    <div className={styles.leakStatValue}>{formatMoney(leak.average_amount)}</div>
                  </div>
                  <div className={styles.leakStat}>
                    <div className={styles.leakStatLabel}>Итого в месяц</div>
                    <div className={styles.leakStatValue} style={{ color: "#dc2626" }}>
                      {formatMoney(leak.monthly_total)}
                    </div>
                  </div>
                  <div className={styles.leakStat}>
                    <div className={styles.leakStatLabel}>Тип</div>
                    <div className={styles.leakStatValue}>
                      {leak.leak_type === "frequent_small"
                        ? "Частые мелкие"
                        : leak.leak_type === "subscription"
                        ? "Подписка"
                        : "Импульсивные"}
                    </div>
                  </div>
                </div>
                <div className={styles.leakSuggestion}>
                  <strong>💡 Рекомендация:</strong> {leak.suggestion}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Персональные советы */}
      {report.personalized_advice.length > 0 && (
        <div className={styles.personalAdviceSection}>
          <h2>🎓 Персональные советы</h2>
          <div className={styles.adviceList}>
            {report.personalized_advice.map((advice, idx) => (
              <div key={idx} className={styles.adviceCard}>
                {advice}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
