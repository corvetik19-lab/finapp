"use client";

import { useEffect, useState } from "react";
import styles from "./AIAnalyticsContent.module.css";
import FinancialHealthScore from "./FinancialHealthScore";
import AIInsights from "./AIInsights";
import FinancialTips from "./FinancialTips";
import ForecastChart from "./ForecastChart";
import AnomaliesDetection from "./AnomaliesDetection";

type InsightType = "positive" | "warning" | "info";
type ScoreStatus = "good" | "warning" | "poor";

type Insight = {
  id: string;
  type: InsightType;
  title: string;
  text: string;
};

type Tip = {
  id: string;
  icon: string;
  title: string;
  text: string;
};

type ForecastMonth = {
  month: string;
  predictedIncome: number;
  predictedExpenses: number;
  confidence: number;
};

type Forecast = {
  nextMonths: ForecastMonth[];
  summary: string;
};

type Anomaly = {
  id: string;
  type: "expense" | "income";
  category: string;
  amount: number;
  averageAmount: number;
  percentageChange: number;
  description: string;
  severity: "low" | "medium" | "high";
};

type AnalyticsData = {
  healthScore: number;
  scoreChange: number;
  scoreStatus: ScoreStatus;
  insights: Insight[];
  tips: Tip[];
  summary?: string;
  forecast?: Forecast;
  anomalies?: Anomaly[];
};

export default function AIAnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/ai/analytics");
        
        if (!res.ok) {
          throw new Error("Failed to load analytics");
        }
        
        const analyticsData = await res.json();
        setData(analyticsData);
        setError(null);
      } catch (err) {
        console.error("Error loading AI analytics:", err);
        setError("Не удалось загрузить аналитику. Попробуйте обновить страницу.");
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>AI Аналитика</h1>
            <p className={styles.subtitle}>Загружаем персональные рекомендации...</p>
          </div>
        </header>
        
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>
            <span className={styles.aiIcon}>🤖</span> AI анализирует ваши финансы...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>AI Аналитика</h1>
            <p className={styles.subtitle}>Персональные рекомендации на основе анализа ваших финансов</p>
          </div>
        </header>
        
        <div className={styles.errorContainer}>
          <span className={styles.errorIcon}>⚠️</span>
          <p className={styles.errorText}>{error || "Произошла ошибка при загрузке данных"}</p>
          <button 
            onClick={() => window.location.reload()} 
            className={styles.retryButton}
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>
            <span className={styles.aiIcon}>🤖</span> AI Аналитика
          </h1>
          <p className={styles.subtitle}>
            Персональные рекомендации на основе анализа ваших финансов
          </p>
          {data.summary && (
            <div className={styles.summary}>
              <p>{data.summary}</p>
            </div>
          )}
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className={styles.refreshButton}
          title="Обновить анализ"
        >
          <span className="material-icons">refresh</span>
          Обновить
        </button>
      </header>

      <div className={styles.grid}>
        <FinancialHealthScore
          score={data.healthScore}
          change={data.scoreChange}
          status={data.scoreStatus}
        />

        <AIInsights insights={data.insights} />

        {data.tips.length > 0 && <FinancialTips tips={data.tips} />}

        {data.forecast && (
          <ForecastChart forecast={data.forecast} />
        )}

        {data.anomalies !== undefined && (
          <AnomaliesDetection anomalies={data.anomalies} />
        )}
      </div>
    </div>
  );
}
