"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import styles from "./Analytics.module.css";
import {
  type PeriodComparison,
  formatMoney,
  getTrendIcon,
  getTrendColor,
} from "@/lib/analytics/comparison";

export default function PeriodComparisonView() {
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparisonType, setComparisonType] = useState<"month" | "year">("month");

  useEffect(() => {
    loadComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonType]);

  async function loadComparison() {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/comparison?type=${comparisonType}`);
      if (!res.ok) {
        throw new Error("Failed to load comparison");
      }
      const data = await res.json();
      setComparison(data.comparison);
    } catch (err) {
      console.error("Error loading comparison:", err);
      setError("Не удалось загрузить сравнение");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Анализируем данные...</p>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className={styles.error}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2>Ошибка загрузки</h2>
        <p>{error || "Нет данных"}</p>
      </div>
    );
  }

  const { metrics, current_period, previous_period, by_category, timeline } = comparison;

  // График временной динамики
  const chartData = {
    labels: timeline.map((t) => t.label),
    datasets: [
      {
        label: "Доходы",
        data: timeline.map((t) => t.income / 100),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
      },
      {
        label: "Расходы",
        data: timeline.map((t) => t.expense / 100),
        borderColor: "#dc2626",
        backgroundColor: "rgba(220, 38, 38, 0.1)",
        tension: 0.4,
      },
      {
        label: "Баланс",
        data: timeline.map((t) => t.balance / 100),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Динамика за последние 12 месяцев",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => `${Number(value).toLocaleString("ru-RU")} ₽`,
        },
      },
    },
  };

  return (
    <div className={styles.comparisonView}>
      {/* Переключатель типа */}
      <div className={styles.comparisonTabs}>
        <button
          className={comparisonType === "month" ? styles.active : ""}
          onClick={() => setComparisonType("month")}
        >
          Месяц к месяцу
        </button>
        <button
          className={comparisonType === "year" ? styles.active : ""}
          onClick={() => setComparisonType("year")}
        >
          Год к году
        </button>
      </div>

      {/* Заголовок периодов */}
      <div className={styles.periodHeader}>
        <div className={styles.periodBox}>
          <div className={styles.periodLabel}>Текущий период</div>
          <div className={styles.periodName}>{current_period.label}</div>
        </div>
        <div className={styles.vs}>VS</div>
        <div className={styles.periodBox}>
          <div className={styles.periodLabel}>Предыдущий период</div>
          <div className={styles.periodName}>{previous_period.label}</div>
        </div>
      </div>

      {/* Основные метрики */}
      <div className={styles.metricsGrid}>
        <MetricCard
          title="Доходы"
          icon="💰"
          metric={metrics.total_income}
          higherIsBetter={true}
        />
        <MetricCard
          title="Расходы"
          icon="💸"
          metric={metrics.total_expense}
          higherIsBetter={false}
        />
        <MetricCard
          title="Чистый баланс"
          icon="📊"
          metric={metrics.net_balance}
          higherIsBetter={true}
        />
        <MetricCard
          title="Норма накоплений"
          icon="🎯"
          metric={metrics.savings_rate}
          isPercentage={true}
          higherIsBetter={true}
        />
      </div>

      {/* График */}
      <div className={styles.chartSection}>
        <h2>📈 Динамика показателей</h2>
        <div className={styles.chartContainer}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Сравнение по категориям */}
      <div className={styles.categoriesSection}>
        <h2>📋 Сравнение по категориям</h2>
        <div className={styles.categoriesTable}>
          <div className={styles.tableHeader}>
            <div>Категория</div>
            <div>Текущий период</div>
            <div>Предыдущий</div>
            <div>Изменение</div>
            <div>%</div>
          </div>
          {by_category.slice(0, 10).map((cat) => (
            <div key={cat.category} className={styles.tableRow}>
              <div className={styles.categoryName}>
                {getTrendIcon(cat.trend)} {cat.category}
              </div>
              <div className={styles.amount}>{formatMoney(cat.current)}</div>
              <div className={styles.amount}>{formatMoney(cat.previous)}</div>
              <div
                className={styles.change}
                style={{
                  color: getTrendColor(cat.trend, false),
                }}
              >
                {cat.change >= 0 ? "+" : ""}
                {formatMoney(cat.change)}
              </div>
              <div
                className={styles.percentage}
                style={{
                  color: getTrendColor(cat.trend, false),
                }}
              >
                {cat.change_percentage >= 0 ? "+" : ""}
                {cat.change_percentage.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  icon: string;
  metric: {
    current: number;
    previous: number;
    change: number;
    change_percentage: number;
    trend: "up" | "down" | "stable";
  };
  isPercentage?: boolean;
  higherIsBetter?: boolean;
}

function MetricCard({ title, icon, metric, isPercentage, higherIsBetter }: MetricCardProps) {
  const formatValue = (value: number) => {
    if (isPercentage) {
      return `${value.toFixed(1)}%`;
    }
    return formatMoney(value);
  };

  return (
    <div className={styles.metricCard}>
      <div className={styles.metricHeader}>
        <span className={styles.metricIcon}>{icon}</span>
        <span className={styles.metricTitle}>{title}</span>
      </div>
      <div className={styles.metricValue}>{formatValue(metric.current)}</div>
      <div className={styles.metricComparison}>
        <span className={styles.metricPrevious}>Было: {formatValue(metric.previous)}</span>
      </div>
      <div
        className={styles.metricChange}
        style={{
          color: getTrendColor(metric.trend, higherIsBetter),
        }}
      >
        <span className={styles.trendIcon}>{getTrendIcon(metric.trend)}</span>
        <span>
          {metric.change >= 0 ? "+" : ""}
          {isPercentage ? metric.change.toFixed(1) + "%" : formatMoney(metric.change)}
        </span>
        <span className={styles.changePercent}>
          ({metric.change_percentage >= 0 ? "+" : ""}
          {metric.change_percentage.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}
