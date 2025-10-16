"use client";

import { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import styles from "./Analytics.module.css";
import type { FinancialHealthReport } from "@/lib/analytics/financial-health";
import { getScoreColor, getGradeLabel } from "@/lib/analytics/financial-health";

export default function FinancialHealthView() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<FinancialHealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFinancialHealth();
  }, []);

  async function loadFinancialHealth() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/financial-health");
      if (!res.ok) {
        throw new Error("Failed to load financial health");
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error("Error loading financial health:", err);
      setError("Не удалось загрузить оценку финансового здоровья");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Анализируем финансовое здоровье...</p>
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

  const { overall_score, grade, categories, insights, recommendations } = report;

  // Gauge chart data
  const gaugeData = {
    datasets: [
      {
        data: [overall_score, 100 - overall_score],
        backgroundColor: [getScoreColor(overall_score), "#e5e7eb"],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      },
    ],
  };

  const gaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <div className={styles.financialHealthView}>
      {/* Главный score */}
      <div className={styles.scoreSection}>
        <h2>💊 Финансовое здоровье</h2>
        <div className={styles.scoreCard}>
          <div className={styles.gaugeContainer}>
            <Doughnut data={gaugeData} options={gaugeOptions} />
            <div className={styles.gaugeCenter}>
              <div className={styles.scoreValue} style={{ color: getScoreColor(overall_score) }}>
                {overall_score}
              </div>
              <div className={styles.scoreMax}>из 100</div>
              <div
                className={styles.gradeLabel}
                style={{ backgroundColor: getScoreColor(overall_score) }}
              >
                {getGradeLabel(grade)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Инсайты */}
      <div className={styles.insightsSection}>
        <h2>💡 Ключевые выводы</h2>
        <div className={styles.insightsList}>
          {insights.map((insight, index) => (
            <div key={index} className={styles.insightCard}>
              {insight}
            </div>
          ))}
        </div>
      </div>

      {/* Категории */}
      <div className={styles.categoriesScoreSection}>
        <h2>📊 Оценка по категориям</h2>
        <div className={styles.categoriesScoreGrid}>
          <CategoryScoreCard
            title="💰 Сбережения"
            score={categories.savings.score}
            status={categories.savings.status}
            details={categories.savings.details}
            weight={categories.savings.weight}
          />
          <CategoryScoreCard
            title="📋 Бюджет"
            score={categories.budget.score}
            status={categories.budget.status}
            details={categories.budget.details}
            weight={categories.budget.weight}
          />
          <CategoryScoreCard
            title="💳 Долги"
            score={categories.debt.score}
            status={categories.debt.status}
            details={categories.debt.details}
            weight={categories.debt.weight}
          />
          <CategoryScoreCard
            title="📈 Стабильность"
            score={categories.stability.score}
            status={categories.stability.status}
            details={categories.stability.details}
            weight={categories.stability.weight}
          />
        </div>
      </div>

      {/* Рекомендации */}
      {recommendations.length > 0 && (
        <div className={styles.recommendationsSection}>
          <h2>🎯 Рекомендации по улучшению</h2>
          <div className={styles.recommendationsList}>
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`${styles.recommendationCard} ${
                  rec.priority === "high"
                    ? styles.priorityHigh
                    : rec.priority === "medium"
                    ? styles.priorityMedium
                    : styles.priorityLow
                }`}
              >
                <div className={styles.recommendationHeader}>
                  <div className={styles.recommendationCategory}>
                    {rec.category}
                  </div>
                  <div className={styles.recommendationImpact}>
                    +{rec.impact} баллов
                  </div>
                </div>
                <div className={styles.recommendationTitle}>{rec.title}</div>
                <div className={styles.recommendationDescription}>
                  {rec.description}
                </div>
                <div className={styles.recommendationPriority}>
                  Приоритет:{" "}
                  {rec.priority === "high"
                    ? "🔴 Высокий"
                    : rec.priority === "medium"
                    ? "🟡 Средний"
                    : "🟢 Низкий"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CategoryScoreCardProps {
  title: string;
  score: number;
  status: "excellent" | "good" | "fair" | "poor";
  details: string;
  weight: number;
}

function CategoryScoreCard({ title, score, status, details, weight }: CategoryScoreCardProps) {
  const statusColors = {
    excellent: "#10b981",
    good: "#3b82f6",
    fair: "#f59e0b",
    poor: "#dc2626",
  };

  const statusLabels = {
    excellent: "Отлично",
    good: "Хорошо",
    fair: "Норма",
    poor: "Плохо",
  };

  return (
    <div className={styles.categoryScoreCard}>
      <div className={styles.categoryScoreHeader}>
        <div className={styles.categoryScoreTitle}>{title}</div>
        <div className={styles.categoryScoreWeight}>Вес: {(weight * 100).toFixed(0)}%</div>
      </div>

      <div className={styles.categoryScoreValue} style={{ color: statusColors[status] }}>
        {score}
        <span className={styles.categoryScoreMax}>/100</span>
      </div>

      <div className={styles.categoryScoreBar}>
        <div
          className={styles.categoryScoreProgress}
          style={{
            width: `${score}%`,
            backgroundColor: statusColors[status],
          }}
        ></div>
      </div>

      <div className={styles.categoryScoreStatus} style={{ color: statusColors[status] }}>
        {statusLabels[status]}
      </div>

      <div className={styles.categoryScoreDetails}>{details}</div>
    </div>
  );
}
