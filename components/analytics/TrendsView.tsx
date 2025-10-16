"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import styles from "./Analytics.module.css";
import type { TrendsReport } from "@/lib/analytics/trends";
import {
  formatMoney,
  getTrendIcon,
  getTrendColor,
  getVelocityBadge,
} from "@/lib/analytics/trends";

export default function TrendsView() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<TrendsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrends();
  }, []);

  async function loadTrends() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/trends?months=6");
      if (!res.ok) {
        throw new Error("Failed to load trends");
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error("Error loading trends:", err);
      setError("Не удалось загрузить анализ трендов");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Анализируем тренды...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className={styles.error}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2>Ошибка загрузки</h2>
        <p>{error || "Нет данных"}</p>
      </div>
    );
  }

  const { categories, overall_trend, insights, alerts } = report;

  return (
    <div className={styles.trendsView}>
      {/* Общий тренд */}
      <div className={styles.overallTrendSection}>
        <h2>📊 Общий тренд</h2>
        <div className={styles.overallTrendCard}>
          <div className={styles.overallMetric}>
            <div className={styles.metricLabel}>Средний чек</div>
            <div className={styles.metricValue}>
              {formatMoney(overall_trend.average_spending_per_transaction)}
            </div>
          </div>
          <div className={styles.overallMetric}>
            <div className={styles.metricLabel}>Транзакций</div>
            <div className={styles.metricValue}>{overall_trend.total_transactions}</div>
          </div>
          <div className={styles.overallMetric}>
            <div className={styles.metricLabel}>Тренд</div>
            <div
              className={styles.trendIndicator}
              style={{ color: getTrendColor(overall_trend.trend_direction, false) }}
            >
              {getTrendIcon(overall_trend.trend_direction)}
              <span>
                {overall_trend.change_percentage >= 0 ? "+" : ""}
                {overall_trend.change_percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Инсайты */}
      {insights.length > 0 && (
        <div className={styles.insightsSection}>
          <h2>💡 Ключевые инсайты</h2>
          <div className={styles.insightsList}>
            {insights.map((insight, index) => (
              <div key={index} className={styles.insightCard}>
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Алерты */}
      {alerts.length > 0 && (
        <div className={styles.alertsSection}>
          <h2>⚠️ Предупреждения</h2>
          <div className={styles.alertsList}>
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`${styles.alertCard} ${
                  styles[`alert${alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}`]
                }`}
              >
                <div className={styles.alertHeader}>
                  <span className={styles.alertType}>
                    {alert.type === "rapid_growth"
                      ? "🚀 Быстрый рост"
                      : alert.type === "rapid_decline"
                      ? "📉 Быстрое снижение"
                      : alert.type === "volatility"
                      ? "📊 Волатильность"
                      : "⚠️ Аномалия"}
                  </span>
                  <span className={styles.alertSeverity}>
                    {alert.severity === "high" ? "ВЫСОКИЙ" : alert.severity === "medium" ? "СРЕДНИЙ" : "НИЗКИЙ"}
                  </span>
                </div>
                <div className={styles.alertMessage}>{alert.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Тренды по категориям */}
      <div className={styles.categoryTrendsSection}>
        <h2>📈 Тренды по категориям</h2>
        <div className={styles.categoryTrendsList}>
          {categories.slice(0, 10).map((cat) => (
            <div key={cat.category} className={styles.categoryTrendCard}>
              <div className={styles.categoryTrendHeader}>
                <div className={styles.categoryTrendName}>{cat.category}</div>
                <div
                  className={styles.trendBadge}
                  style={{
                    backgroundColor: getVelocityBadge(cat.trend.velocity).color,
                  }}
                >
                  {getVelocityBadge(cat.trend.velocity).text}
                </div>
              </div>

              <div className={styles.categoryTrendMetrics}>
                <div className={styles.categoryMetric}>
                  <div className={styles.categoryMetricLabel}>Средний чек</div>
                  <div className={styles.categoryMetricValue}>
                    {formatMoney(cat.average_transaction)}
                  </div>
                </div>
                <div className={styles.categoryMetric}>
                  <div className={styles.categoryMetricLabel}>Транзакций</div>
                  <div className={styles.categoryMetricValue}>{cat.transaction_count}</div>
                </div>
                <div className={styles.categoryMetric}>
                  <div className={styles.categoryMetricLabel}>Всего</div>
                  <div className={styles.categoryMetricValue}>
                    {formatMoney(cat.total_amount)}
                  </div>
                </div>
              </div>

              <div
                className={styles.categoryTrendIndicator}
                style={{ color: getTrendColor(cat.trend.direction, false) }}
              >
                <span className={styles.trendIcon}>
                  {getTrendIcon(cat.trend.direction)}
                </span>
                <span className={styles.trendText}>
                  {cat.trend.direction === "growing"
                    ? "Растёт"
                    : cat.trend.direction === "declining"
                    ? "Снижается"
                    : "Стабильно"}
                </span>
                <span className={styles.trendPercentage}>
                  {cat.trend.change_percentage >= 0 ? "+" : ""}
                  {cat.trend.change_percentage.toFixed(1)}%
                </span>
              </div>

              {/* Мини-график */}
              {cat.history.length > 1 && (
                <div className={styles.miniChart}>
                  <Line
                    data={{
                      labels: cat.history.map((h) => {
                        const [year, month] = h.month.split("-");
                        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
                          "ru-RU",
                          { month: "short" }
                        );
                      }),
                      datasets: [
                        {
                          data: cat.history.map((h) => h.average / 100),
                          borderColor: getTrendColor(cat.trend.direction, false),
                          backgroundColor: "transparent",
                          tension: 0.4,
                          pointRadius: 3,
                          pointHoverRadius: 5,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) => `${context.parsed.y.toFixed(0)} ₽`,
                          },
                        },
                      },
                      scales: {
                        x: { display: false },
                        y: { display: false },
                      },
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
