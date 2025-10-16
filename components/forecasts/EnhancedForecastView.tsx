"use client";

import { useState, useEffect } from "react";
import styles from "./Forecasts.module.css";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CategoryForecast {
  category: string;
  categoryId: string;
  predicted: number;
  historical_avg: number;
  trend: "up" | "down" | "stable";
  confidence: number;
  reasoning: string;
}

interface ForecastData {
  total_predicted: number;
  total_income_predicted: number;
  categories: CategoryForecast[];
  seasonality_factor: number;
  trend_direction: "up" | "down" | "stable";
  confidence: number;
  advice: string[];
}

export default function EnhancedForecastView() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(6);

  // Устанавливаем флаг после монтирования на клиенте
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadForecast();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, mounted]);

  async function loadForecast() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ai/forecast?type=enhanced&months=${months}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка загрузки прогноза");
      }

      setForecast(data.enhanced);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return "📈";
    if (trend === "down") return "📉";
    return "➡️";
  };

  const getTrendColor = (trend: string) => {
    if (trend === "up") return "#ef4444";
    if (trend === "down") return "#10b981";
    return "#6b7280";
  };

  // Предотвращаем hydration mismatch - показываем загрузку до монтирования
  if (!mounted) {
    return (
      <div className={styles.enhancedForecast}>
        <div className={styles.loading}>Загрузка прогноза...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Анализируем ваши траты...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <span className="material-icons">error_outline</span>
        <h3>Ошибка загрузки прогноза</h3>
        <p>{error}</p>
        <button onClick={loadForecast} className={styles.retryBtn}>
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!forecast || forecast.categories.length === 0) {
    return (
      <div className={styles.empty}>
        <span className="material-icons">insights</span>
        <h3>Недостаточно данных</h3>
        <p>Добавьте транзакции за несколько месяцев для построения прогноза</p>
      </div>
    );
  }

  // Данные для графика
  const chartData = {
    labels: forecast.categories.slice(0, 10).map(c => c.category),
    datasets: [
      {
        label: "Прогноз",
        data: forecast.categories.slice(0, 10).map(c => c.predicted / 100),
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 2,
        fill: true,
      },
      {
        label: "Среднее",
        data: forecast.categories.slice(0, 10).map(c => c.historical_avg / 100),
        backgroundColor: "rgba(156, 163, 175, 0.1)",
        borderColor: "rgba(156, 163, 175, 1)",
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number } }) => {
            const value = context.parsed?.y ?? 0;
            return `${context.dataset.label}: ${value.toFixed(0)}₽`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) => `${value}₽`,
        },
      },
    },
  };

  return (
    <div className={styles.enhancedForecast}>
      {/* Контролы */}
      <div className={styles.controls}>
        <label>
          Анализ за:
          <select value={months} onChange={(e) => setMonths(parseInt(e.target.value))}>
            <option value="3">3 месяца</option>
            <option value="6">6 месяцев</option>
            <option value="12">12 месяцев</option>
          </select>
        </label>
      </div>

      {/* Общий прогноз */}
      <div className={styles.totalForecast}>
        <div className={styles.forecastCard}>
          <div className={styles.cardHeader}>
            <span className="material-icons">trending_up</span>
            <h3>Прогноз на следующий месяц</h3>
          </div>
          <div className={styles.amount}>
            {formatMoney(forecast.total_predicted)}
          </div>
          <div className={styles.meta}>
            <span className={styles.trend} style={{ color: getTrendColor(forecast.trend_direction) }}>
              {getTrendIcon(forecast.trend_direction)} Тренд: {forecast.trend_direction === "up" ? "Рост" : forecast.trend_direction === "down" ? "Снижение" : "Стабильно"}
            </span>
            <span className={styles.confidence}>
              Уверенность: {forecast.confidence}%
            </span>
          </div>
          {forecast.seasonality_factor !== 1.0 && (
            <div className={styles.seasonality}>
              📅 Сезонность: {forecast.seasonality_factor > 1 ? "Высокие траты" : "Низкие траты"} ({(forecast.seasonality_factor * 100).toFixed(0)}%)
            </div>
          )}
        </div>

        <div className={styles.forecastCard}>
          <div className={styles.cardHeader}>
            <span className="material-icons">account_balance</span>
            <h3>Прогноз баланса</h3>
          </div>
          <div className={styles.amount}>
            {formatMoney(forecast.total_income_predicted - forecast.total_predicted)}
          </div>
          <div className={styles.meta}>
            <span>Доход: {formatMoney(forecast.total_income_predicted)}</span>
            <span>Расход: {formatMoney(forecast.total_predicted)}</span>
          </div>
        </div>
      </div>

      {/* График по категориям */}
      <div className={styles.chartSection}>
        <h3>Прогноз по категориям</h3>
        <div className={styles.chartContainer}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Таблица категорий */}
      <div className={styles.categoriesTable}>
        <h3>Детальный прогноз</h3>
        <table>
          <thead>
            <tr>
              <th>Категория</th>
              <th>Прогноз</th>
              <th>Среднее</th>
              <th>Тренд</th>
              <th>Уверенность</th>
            </tr>
          </thead>
          <tbody>
            {forecast.categories.map((cat) => (
              <tr key={cat.categoryId || cat.category}>
                <td>
                  <strong>{cat.category}</strong>
                  <div className={styles.reasoning}>{cat.reasoning}</div>
                </td>
                <td className={styles.predicted}>
                  {formatMoney(cat.predicted)}
                </td>
                <td className={styles.avg}>
                  {formatMoney(cat.historical_avg)}
                </td>
                <td>
                  <span style={{ color: getTrendColor(cat.trend) }}>
                    {getTrendIcon(cat.trend)}
                  </span>
                </td>
                <td>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progress}
                      style={{ width: `${cat.confidence}%` }}
                    ></div>
                    <span>{cat.confidence}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Советы */}
      {forecast.advice.length > 0 && (
        <div className={styles.adviceSection}>
          <h3>💡 Рекомендации</h3>
          <ul className={styles.adviceList}>
            {forecast.advice.map((advice, index) => (
              <li key={index}>{advice}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
