"use client";

import { useEffect, useState } from "react";
import styles from "./Analytics.module.css";
import type { SeasonalityReport } from "@/lib/analytics/seasonality";
import { formatMoney } from "@/lib/analytics/seasonality";

export default function SeasonalityView() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SeasonalityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSeasonality();
  }, []);

  async function loadSeasonality() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/seasonality?months=12");
      if (!res.ok) {
        throw new Error("Failed to load seasonality");
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error("Error loading seasonality:", err);
      setError("Не удалось загрузить анализ сезонности");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Анализируем сезонность...</p>
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

  const { by_month, by_season, by_weekday, by_day_of_month, heatmap_data, insights, recommendations } = report;

  return (
    <div className={styles.seasonalityView}>
      {/* Инсайты */}
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

      {/* Heatmap календарь */}
      {heatmap_data.data.length > 0 && (
        <div className={styles.heatmapSection}>
          <h2>🔥 Тепловая карта трат по категориям</h2>
          <div className={styles.heatmapContainer}>
            <div className={styles.heatmapGrid}>
              {/* Заголовки месяцев */}
              <div className={styles.heatmapHeader}>
                <div className={styles.heatmapCorner}>Категория</div>
                {heatmap_data.months.map((month) => (
                  <div key={month} className={styles.heatmapMonthLabel}>
                    {month}
                  </div>
                ))}
              </div>

              {/* Строки категорий */}
              {heatmap_data.categories.map((category, catIndex) => (
                <div key={category} className={styles.heatmapRow}>
                  <div className={styles.heatmapCategoryLabel}>{category}</div>
                  {heatmap_data.data[catIndex].map((value, monthIndex) => {
                    const intensity = heatmap_data.max_value > 0 ? value / heatmap_data.max_value : 0;
                    return (
                      <div
                        key={monthIndex}
                        className={styles.heatmapCell}
                        style={{
                          backgroundColor: getHeatmapColor(intensity),
                        }}
                        title={`${category} - ${heatmap_data.months[monthIndex]}: ${formatMoney(value)}`}
                      >
                        {value > 0 && formatShortMoney(value)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className={styles.heatmapLegend}>
              <span>Низкие траты</span>
              <div className={styles.legendGradient}></div>
              <span>Высокие траты</span>
            </div>
          </div>
        </div>
      )}

      {/* Анализ по месяцам */}
      <div className={styles.monthlyAnalysis}>
        <h2>📅 Анализ по месяцам</h2>
        <div className={styles.monthsGrid}>
          {by_month.map((month) => (
            <div
              key={month.month}
              className={`${styles.monthCard} ${
                month.trend === "high"
                  ? styles.highMonth
                  : month.trend === "low"
                  ? styles.lowMonth
                  : styles.normalMonth
              }`}
            >
              <div className={styles.monthName}>{month.month_name}</div>
              <div className={styles.monthValue}>{formatMoney(month.average_spending)}</div>
              <div className={styles.monthComparison}>
                {month.compared_to_average >= 0 ? "+" : ""}
                {month.compared_to_average.toFixed(1)}% от среднего
              </div>
              <div className={styles.monthTransactions}>
                {month.transaction_count} транзакций
              </div>
              {month.top_categories.length > 0 && (
                <div className={styles.monthCategories}>
                  <strong>Топ:</strong>
                  {month.top_categories.map((cat, idx) => (
                    <span key={idx}>
                      {cat.category} ({formatShortMoney(cat.amount)})
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Анализ по сезонам */}
      <div className={styles.seasonalAnalysis}>
        <h2>🌍 Анализ по сезонам</h2>
        <div className={styles.seasonsGrid}>
          {by_season.map((season) => (
            <div key={season.season} className={`${styles.seasonCard} ${styles[season.season]}`}>
              <div className={styles.seasonIcon}>{getSeasonIcon(season.season)}</div>
              <div className={styles.seasonName}>{season.season_name}</div>
              <div className={styles.seasonValue}>{formatMoney(season.average_spending)}</div>
              <div className={styles.seasonComparison}>
                {season.compared_to_average >= 0 ? "+" : ""}
                {season.compared_to_average.toFixed(1)}% от среднего
              </div>
              <div className={styles.seasonCharacteristics}>{season.characteristics}</div>
              <div className={styles.seasonTransactions}>
                {season.transaction_count} транзакций
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Анализ по дням недели */}
      <div className={styles.weekdayAnalysis}>
        <h2>📆 Анализ по дням недели</h2>
        <div className={styles.weekdaysGrid}>
          {by_weekday.map((weekday) => (
            <div key={weekday.weekday} className={styles.weekdayCard}>
              <div className={styles.weekdayName}>{weekday.weekday_name}</div>
              <div className={styles.weekdayValue}>{formatMoney(weekday.average_spending)}</div>
              <div className={styles.weekdayTransactions}>
                {weekday.transaction_count} транзакций
              </div>
              {weekday.peak_hours.length > 0 && (
                <div className={styles.weekdayPeakHours}>
                  🕐 Пик: {weekday.peak_hours.map((h) => `${h}:00`).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Анализ по периодам месяца */}
      <div className={styles.dayRangeAnalysis}>
        <h2>📊 Траты по периодам месяца</h2>
        <div className={styles.dayRangesGrid}>
          {by_day_of_month.map((range) => (
            <div key={range.day_range} className={styles.dayRangeCard}>
              <div className={styles.dayRangeLabel}>{range.day_range} числа</div>
              <div className={styles.dayRangeValue}>{formatMoney(range.average_spending)}</div>
              <div className={styles.dayRangeComparison}>
                {range.compared_to_average >= 0 ? "+" : ""}
                {range.compared_to_average.toFixed(1)}% от среднего
              </div>
              <div className={styles.dayRangeTransactions}>
                {range.transaction_count} транзакций
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Рекомендации */}
      <div className={styles.recommendationsSection}>
        <h2>🎯 Рекомендации по планированию</h2>
        <div className={styles.recommendationsList}>
          {recommendations.map((rec, index) => (
            <div key={index} className={styles.recommendationCard}>
              {rec}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getHeatmapColor(intensity: number): string {
  // От белого к красному
  if (intensity === 0) return "#f9fafb";
  if (intensity < 0.2) return "#fef3c7";
  if (intensity < 0.4) return "#fcd34d";
  if (intensity < 0.6) return "#fbbf24";
  if (intensity < 0.8) return "#f59e0b";
  return "#ea580c";
}

function getSeasonIcon(season: string): string {
  switch (season) {
    case "winter":
      return "❄️";
    case "spring":
      return "🌸";
    case "summer":
      return "☀️";
    case "autumn":
      return "🍂";
    default:
      return "🌍";
  }
}

function formatShortMoney(kopecks: number): string {
  const rubles = kopecks / 100;
  if (rubles >= 1000000) {
    return `${(rubles / 1000000).toFixed(1)}M`;
  }
  if (rubles >= 1000) {
    return `${(rubles / 1000).toFixed(0)}K`;
  }
  return `${Math.round(rubles)}`;
}
