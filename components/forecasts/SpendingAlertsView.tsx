"use client";

import { useEffect, useState } from "react";
import styles from "./Forecasts.module.css";
import {
  type AnomalyReport,
  getSeverityColor,
  getAlertIcon,
} from "@/lib/ai/anomaly-detector";

export default function SpendingAlertsView() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AnomalyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      const res = await fetch("/api/ai/anomaly-detector");
      if (!res.ok) {
        throw new Error("Failed to load alerts");
      }
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      console.error("Error loading alerts:", err);
      setError("Не удалось загрузить предупреждения");
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
        <p>Анализируем ваши траты...</p>
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

  if (!report) {
    return (
      <div className={styles.error}>
        <div className={styles.errorIcon}>📊</div>
        <h2>Нет данных</h2>
        <p>Недостаточно транзакций для анализа</p>
      </div>
    );
  }

  const { alerts, total_spending_this_month, avg_monthly_spending, change_percentage } =
    report;

  return (
    <div className={styles.spendingAlertsView}>
      {/* Общая статистика */}
      <div className={styles.statsOverview}>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Траты этого месяца</div>
          <div className={styles.statValue}>{formatMoney(total_spending_this_month)}</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Средние траты</div>
          <div className={styles.statValue}>{formatMoney(avg_monthly_spending)}</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Изменение</div>
          <div
            className={styles.statValue}
            style={{
              color: change_percentage >= 20 ? "#dc2626" : change_percentage >= 10 ? "#f59e0b" : "#10b981",
            }}
          >
            {change_percentage > 0 ? "+" : ""}
            {change_percentage.toFixed(1)}%
          </div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Предупреждений</div>
          <div
            className={styles.statValue}
            style={{
              color: alerts.length >= 5 ? "#dc2626" : alerts.length >= 3 ? "#f59e0b" : "#10b981",
            }}
          >
            {alerts.length}
          </div>
        </div>
      </div>

      {/* Алерты */}
      {alerts.length === 0 ? (
        <div className={styles.noAlerts}>
          <div className={styles.noAlertsIcon}>✅</div>
          <h2>Всё в порядке!</h2>
          <p>Никаких рисков перерасхода не обнаружено. Продолжайте контролировать свои траты.</p>
        </div>
      ) : (
        <div className={styles.alertsList}>
          <h2 className={styles.alertsTitle}>
            ⚠️ Обнаружено {alerts.length} {alerts.length === 1 ? "предупреждение" : "предупреждений"}
          </h2>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={styles.alertCard}
              style={{
                borderLeftColor: getSeverityColor(alert.severity),
              }}
            >
              <div className={styles.alertHeader}>
                <div className={styles.alertTitle}>
                  <span className={styles.alertIcon}>{getAlertIcon(alert.type)}</span>
                  <span>{alert.title}</span>
                </div>
                <span
                  className={styles.alertSeverity}
                  style={{
                    backgroundColor: getSeverityColor(alert.severity),
                  }}
                >
                  {alert.severity === "critical"
                    ? "КРИТИЧНО"
                    : alert.severity === "high"
                    ? "ВЫСОКИЙ"
                    : alert.severity === "medium"
                    ? "СРЕДНИЙ"
                    : "НИЗКИЙ"}
                </span>
              </div>
              <p className={styles.alertMessage}>{alert.message}</p>
              <div className={styles.alertRecommendation}>
                <strong>💡 Рекомендация:</strong> {alert.recommendation}
              </div>
              {alert.percentage && (
                <div className={styles.alertPercentage}>
                  <div
                    className={styles.percentageBar}
                    style={{
                      width: `${Math.min(100, alert.percentage)}%`,
                      backgroundColor: getSeverityColor(alert.severity),
                    }}
                  ></div>
                  <span className={styles.percentageLabel}>
                    {alert.percentage.toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Категории в зоне риска */}
      {report.categories_at_risk.filter((c) => c.is_anomaly).length > 0 && (
        <div className={styles.categoriesAtRisk}>
          <h3>📈 Категории с резким ростом трат</h3>
          <div className={styles.categoriesGrid}>
            {report.categories_at_risk
              .filter((c) => c.is_anomaly)
              .slice(0, 6)
              .map((cat) => (
                <div key={cat.category} className={styles.categoryRiskCard}>
                  <div className={styles.categoryName}>{cat.category}</div>
                  <div className={styles.categoryChange}>
                    +{cat.change_percentage.toFixed(0)}%
                  </div>
                  <div className={styles.categoryAmounts}>
                    <span className={styles.currentAmount}>
                      {formatMoney(cat.current_month)}
                    </span>
                    <span className={styles.previousAmount}>
                      vs {formatMoney(cat.previous_avg)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Бюджеты в зоне риска */}
      {report.budgets_at_risk.length > 0 && (
        <div className={styles.budgetsAtRisk}>
          <h3>🎯 Бюджеты в зоне риска</h3>
          <div className={styles.budgetsList}>
            {report.budgets_at_risk.map((budget) => (
              <div key={budget.budget_name} className={styles.budgetRiskCard}>
                <div className={styles.budgetHeader}>
                  <span className={styles.budgetName}>{budget.budget_name}</span>
                  <span className={styles.budgetCategory}>{budget.category}</span>
                </div>
                <div className={styles.budgetProgress}>
                  <div
                    className={styles.budgetBar}
                    style={{
                      width: `${Math.min(100, budget.percentage)}%`,
                      backgroundColor:
                        budget.percentage >= 100
                          ? "#dc2626"
                          : budget.percentage >= 90
                          ? "#ea580c"
                          : "#f59e0b",
                    }}
                  ></div>
                </div>
                <div className={styles.budgetAmounts}>
                  <span>{formatMoney(budget.spent)}</span>
                  <span>/</span>
                  <span>{formatMoney(budget.limit)}</span>
                  <span className={styles.budgetPercentage}>
                    ({budget.percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
