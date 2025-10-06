import styles from "./page.module.css";
import FinancialHealthScore from "@/components/ai-analytics/FinancialHealthScore";
import AIInsights from "@/components/ai-analytics/AIInsights";
import FinancialTips from "@/components/ai-analytics/FinancialTips";

// AI Analytics Page

export default async function AIAnalyticsPage() {
  // TODO: В будущем загружать данные из API/БД
  const healthScore = 78;
  const scoreChange = 5;
  const scoreStatus: "good" | "warning" | "poor" = "good";

  const insights = [
    {
      id: "1",
      type: "positive" as const,
      title: "Оптимизация расходов",
      text: "Вы можете экономить до ₽8,500 в месяц, сократив расходы на развлечения на 15%.",
    },
    {
      id: "2",
      type: "warning" as const,
      title: "Превышение бюджета",
      text: 'Категория "Транспорт" превысила бюджет на 18%. Рекомендуем пересмотреть лимиты.',
    },
    {
      id: "3",
      type: "info" as const,
      title: "Прогноз доходов",
      text: "На основе текущих трендов, прогнозируем увеличение доходов на 12% в следующем месяце.",
    },
  ];

  const tips = [
    {
      id: "1",
      icon: "checklist",
      title: "Создайте резервный фонд",
      text: "Откладывайте 10% от дохода для непредвиденных расходов",
    },
    {
      id: "2",
      icon: "trending_down",
      title: "Сократите расходы",
      text: "Проверьте подписки, которые не используете",
    },
    {
      id: "3",
      icon: "savings",
      title: "Инвестируйте рано",
      text: "Даже ₽5,000 в месяц могут принести значительную прибыль",
    },
  ];

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>AI Аналитика</h1>
          <p className={styles.subtitle}>Персональные рекомендации на основе анализа ваших финансов</p>
        </div>
      </header>

      <div className={styles.grid}>
        <FinancialHealthScore
          score={healthScore}
          change={scoreChange}
          status={scoreStatus}
        />

        <AIInsights insights={insights} />

        <FinancialTips tips={tips} />
      </div>
    </div>
  );
}
