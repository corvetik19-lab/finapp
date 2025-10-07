"use client";

import { useEffect, useRef } from "react";
import { Chart, ChartConfiguration } from "chart.js/auto";
import styles from "./ForecastChart.module.css";

type ForecastMonth = {
  month: string;
  predictedIncome: number;
  predictedExpenses: number;
  confidence: number;
};

type ForecastData = {
  nextMonths: ForecastMonth[];
  summary: string;
};

type Props = {
  forecast: ForecastData;
};

export default function ForecastChart({ forecast }: Props) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !forecast.nextMonths.length) return;

    // Уничтожаем предыдущий график
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const labels = forecast.nextMonths.map(m => m.month);
    const incomeData = forecast.nextMonths.map(m => m.predictedIncome);
    const expensesData = forecast.nextMonths.map(m => m.predictedExpenses);
    const confidenceData = forecast.nextMonths.map(m => m.confidence);

    const config: ChartConfiguration = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Прогноз доходов",
            data: incomeData,
            borderColor: "rgb(34, 197, 94)",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
            borderDash: [5, 5], // Пунктирная линия для прогноза
          },
          {
            label: "Прогноз расходов",
            data: expensesData,
            borderColor: "rgb(239, 68, 68)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
            borderDash: [5, 5],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              font: {
                size: 13,
                weight: 500,
              },
              padding: 15,
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || "";
                const value = context.parsed.y;
                const confidence = confidenceData[context.dataIndex];
                return `${label}: ${value.toLocaleString('ru-RU')}₽ (уверенность: ${confidence}%)`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString('ru-RU') + '₽';
              },
            },
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
        interaction: {
          intersect: false,
          mode: "index",
        },
      },
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [forecast]);

  if (!forecast.nextMonths.length) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <span className={styles.icon}>📈</span>
            Прогноз на будущее
          </h3>
        </div>
        <div className={styles.emptyState}>
          <p>Недостаточно данных для построения прогноза</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.icon}>📈</span>
          AI Прогноз на следующие месяцы
        </h3>
      </div>

      {forecast.summary && (
        <div className={styles.summary}>
          <p>{forecast.summary}</p>
        </div>
      )}

      <div className={styles.chartContainer}>
        <canvas ref={chartRef}></canvas>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.dashedLine} style={{ borderColor: "rgb(34, 197, 94)" }}></span>
          <span>Пунктирная линия = Прогноз AI</span>
        </div>
        <div className={styles.confidenceBadges}>
          {forecast.nextMonths.map((month, i) => (
            <div key={i} className={styles.confidenceBadge}>
              <span className={styles.monthName}>{month.month}</span>
              <span className={`${styles.confidence} ${getConfidenceClass(month.confidence)}`}>
                {month.confidence}% уверенности
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 80) return "high";
  if (confidence >= 60) return "medium";
  return "low";
}
