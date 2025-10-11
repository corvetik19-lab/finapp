"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import styles from "./AdvancedAnalytics.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface PeriodComparison {
  current: {
    income: number;
    expense: number;
    balance: number;
    transactionCount: number;
  };
  previous: {
    income: number;
    expense: number;
    balance: number;
    transactionCount: number;
  };
  changes: {
    income: number;
    expense: number;
    balance: number;
    transactionCount: number;
  };
}

interface TopTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  direction: "income" | "expense" | "transfer";
}

interface CategoryAverage {
  category: string;
  category_id: string;
  averageAmount: number;
  transactionCount: number;
  totalAmount: number;
}

interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

interface AnalyticsData {
  comparison: PeriodComparison;
  top5: TopTransaction[];
  categoryAverages: CategoryAverage[];
  trends: MonthlyTrend[];
}

export default function AdvancedAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics/advanced?period=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [period]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  const getChangeClass = (change: number, inverse = false) => {
    if (change === 0) return styles.neutral;
    const isPositive = inverse ? change < 0 : change > 0;
    return isPositive ? styles.positive : styles.negative;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "month":
        return "месяцем";
      case "quarter":
        return "кварталом";
      case "year":
        return "годом";
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка аналитики...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Не удалось загрузить данные</div>
      </div>
    );
  }

  // Chart data
  const trendsChartData = {
    labels: data.trends.map((t) => {
      const [year, month] = t.month.split("-");
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("ru-RU", {
        month: "short",
        year: "2-digit",
      });
    }),
    datasets: [
      {
        label: "Доходы",
        data: data.trends.map((t) => t.income / 100),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.4,
      },
      {
        label: "Расходы",
        data: data.trends.map((t) => t.expense / 100),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
      },
      {
        label: "Баланс",
        data: data.trends.map((t) => t.balance / 100),
        borderColor: "rgb(79, 70, 229)",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const categoryChartData = {
    labels: data.categoryAverages.map((c) => c.category),
    datasets: [
      {
        label: "Средний чек",
        data: data.categoryAverages.map((c) => c.averageAmount / 100),
        backgroundColor: "rgba(79, 70, 229, 0.8)",
      },
    ],
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Расширенная аналитика</h1>
          <p className={styles.subtitle}>Детальный анализ ваших финансов</p>
        </div>
        <div className={styles.periodSelector}>
          <button
            className={period === "month" ? styles.active : ""}
            onClick={() => setPeriod("month")}
          >
            Месяц
          </button>
          <button
            className={period === "quarter" ? styles.active : ""}
            onClick={() => setPeriod("quarter")}
          >
            Квартал
          </button>
          <button
            className={period === "year" ? styles.active : ""}
            onClick={() => setPeriod("year")}
          >
            Год
          </button>
        </div>
      </div>

      {/* Period Comparison */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          📊 Сравнение с прошлым {getPeriodLabel()}
        </h2>
        <div className={styles.comparisonGrid}>
          <div className={styles.comparisonCard}>
            <div className={styles.comparisonLabel}>Доходы</div>
            <div className={styles.comparisonValue}>
              {formatMoney(data.comparison.current.income)}
            </div>
            <div className={styles.comparisonPrevious}>
              Было: {formatMoney(data.comparison.previous.income)}
            </div>
            <div className={getChangeClass(data.comparison.changes.income)}>
              {formatChange(data.comparison.changes.income)}
            </div>
          </div>

          <div className={styles.comparisonCard}>
            <div className={styles.comparisonLabel}>Расходы</div>
            <div className={styles.comparisonValue}>
              {formatMoney(data.comparison.current.expense)}
            </div>
            <div className={styles.comparisonPrevious}>
              Было: {formatMoney(data.comparison.previous.expense)}
            </div>
            <div className={getChangeClass(data.comparison.changes.expense, true)}>
              {formatChange(data.comparison.changes.expense)}
            </div>
          </div>

          <div className={styles.comparisonCard}>
            <div className={styles.comparisonLabel}>Баланс</div>
            <div className={styles.comparisonValue}>
              {formatMoney(data.comparison.current.balance)}
            </div>
            <div className={styles.comparisonPrevious}>
              Было: {formatMoney(data.comparison.previous.balance)}
            </div>
            <div className={getChangeClass(data.comparison.changes.balance)}>
              {formatChange(data.comparison.changes.balance)}
            </div>
          </div>

          <div className={styles.comparisonCard}>
            <div className={styles.comparisonLabel}>Транзакций</div>
            <div className={styles.comparisonValue}>
              {data.comparison.current.transactionCount}
            </div>
            <div className={styles.comparisonPrevious}>
              Было: {data.comparison.previous.transactionCount}
            </div>
            <div className={getChangeClass(data.comparison.changes.transactionCount)}>
              {formatChange(data.comparison.changes.transactionCount)}
            </div>
          </div>
        </div>
      </section>

      {/* Top 5 Transactions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>💰 Топ-5 самых крупных операций</h2>
        <div className={styles.topList}>
          {data.top5.map((t, index) => (
            <div key={t.id} className={styles.topItem}>
              <div className={styles.topRank}>{index + 1}</div>
              <div className={styles.topInfo}>
                <div className={styles.topDescription}>
                  {t.description || t.category}
                </div>
                <div className={styles.topMeta}>
                  {new Date(t.date).toLocaleDateString("ru-RU")} · {t.category}
                </div>
              </div>
              <div
                className={`${styles.topAmount} ${
                  t.direction === "income" ? styles.income : styles.expense
                }`}
              >
                {t.direction === "income" ? "+" : "-"}
                {formatMoney(t.amount)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category Averages */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📈 Средний чек по категориям</h2>
        <div className={styles.chartContainer}>
          <Bar
            data={categoryChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
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
        <div className={styles.categoryList}>
          {data.categoryAverages.map((c) => (
            <div key={c.category_id} className={styles.categoryItem}>
              <div className={styles.categoryName}>{c.category}</div>
              <div className={styles.categoryStats}>
                <div>Средний чек: {formatMoney(c.averageAmount)}</div>
                <div>Транзакций: {c.transactionCount}</div>
                <div>Всего: {formatMoney(c.totalAmount)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Monthly Trends */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📉 Тренды за 12 месяцев</h2>
        <div className={styles.chartContainer}>
          <Line
            data={trendsChartData}
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
      </section>
    </div>
  );
}
