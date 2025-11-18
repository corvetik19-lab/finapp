"use client";

import { useState } from "react";
import type { CategoryRecord } from "./CategoriesManager";
import type { FinanceSettings } from "@/types/settings";
import styles from "./FinanceGeneralSettings.module.css";

interface Props {
  categories: CategoryRecord[];
  settings: FinanceSettings;
  onSave: (settings: FinanceSettings) => Promise<void>;
}

export default function FinanceGeneralSettings({ categories, settings, onSave }: Props) {
  // Основные
  
  // Настройки бюджета
  const [budgetPeriod, setBudgetPeriod] = useState(settings.budgetPeriod || "month");
  const [budgetWarningType, setBudgetWarningType] = useState(settings.budgetWarningType || "percent");
  const [budgetWarningValue, setBudgetWarningValue] = useState(settings.budgetWarningValue || 90);
  
  // Транзакции
  const [showTransfersInStats, setShowTransfersInStats] = useState(settings.showTransfersInStats ?? true);
  const [autoDetectDuplicates, setAutoDetectDuplicates] = useState(settings.autoDetectDuplicates ?? true);
  const [recentTransactionsDays, setRecentTransactionsDays] = useState(settings.recentTransactionsDays || 7);
  
  // Уведомления
  const [notifyBudgetExceed, setNotifyBudgetExceed] = useState(settings.notifyBudgetExceed ?? true);
  const [remindRecurringDays, setRemindRecurringDays] = useState(settings.remindRecurringDays || 3);
  const [weeklySummary, setWeeklySummary] = useState(settings.weeklySummary ?? false);
  const [weeklySummaryDay, setWeeklySummaryDay] = useState(settings.weeklySummaryDay || "monday");
  
  // Отчеты
  const [defaultReportPeriod, setDefaultReportPeriod] = useState(settings.defaultReportPeriod || "month");
  const [excludeCategories, setExcludeCategories] = useState<string[]>(settings.excludeCategories || []);
  const [chartGrouping, setChartGrouping] = useState(settings.chartGrouping || "days");
  
  // Интерфейс
  const [showZeroBalances, setShowZeroBalances] = useState(settings.showZeroBalances ?? true);
  const [groupTransactionsByDate, setGroupTransactionsByDate] = useState(settings.groupTransactionsByDate ?? true);
  const [dashboardAccounts, setDashboardAccounts] = useState(settings.dashboardAccounts || "all");
  const [chartColorScheme, setChartColorScheme] = useState(settings.chartColorScheme || "standard");
  
  // Автоматизация
  const [autoCategorizationEnabled, setAutoCategorizationEnabled] = useState(settings.autoCategorizationEnabled ?? true);
  const [autoRecurringEnabled, setAutoRecurringEnabled] = useState(settings.autoRecurringEnabled ?? true);
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      await onSave({
        budgetPeriod,
        budgetWarningType,
        budgetWarningValue,
        showTransfersInStats,
        autoDetectDuplicates,
        recentTransactionsDays,
        notifyBudgetExceed,
        remindRecurringDays,
        weeklySummary,
        weeklySummaryDay,
        defaultReportPeriod,
        excludeCategories,
        chartGrouping,
        showZeroBalances,
        groupTransactionsByDate,
        dashboardAccounts,
        chartColorScheme,
        autoCategorizationEnabled,
        autoRecurringEnabled,
      });
      
      setMessage("Настройки сохранены");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const toggleExcludeCategory = (categoryId: string) => {
    setExcludeCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className={styles.container}>
      {/* Основные блок удален */}

      {/* Настройки бюджета */}
      <section className={styles.section}>
        <h2><span className="material-icons">pie_chart</span>Настройки бюджета</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="budgetPeriod">Период бюджета по умолчанию</label>
            <select
              id="budgetPeriod"
              value={budgetPeriod}
              onChange={(e) => setBudgetPeriod(e.target.value)}
              className={styles.select}
            >
              <option value="month">Месяц</option>
              <option value="quarter">Квартал</option>
              <option value="year">Год</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="budgetWarningType">Предупреждение при превышении</label>
            <select
              id="budgetWarningType"
              value={budgetWarningType}
              onChange={(e) => setBudgetWarningType(e.target.value)}
              className={styles.select}
            >
              <option value="percent">Процент (%)</option>
              <option value="amount">Сумма (₽)</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="budgetWarningValue">
              Значение ({budgetWarningType === "percent" ? "%" : "₽"})
            </label>
            <input
              id="budgetWarningValue"
              type="number"
              value={budgetWarningValue}
              onChange={(e) => setBudgetWarningValue(Number(e.target.value))}
              className={styles.input}
              min="0"
              max={budgetWarningType === "percent" ? "100" : undefined}
            />
          </div>
        </div>
      </section>

      {/* Транзакции */}
      <section className={styles.section}>
        <h2><span className="material-icons">receipt_long</span>Транзакции</h2>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={showTransfersInStats}
              onChange={(e) => setShowTransfersInStats(e.target.checked)}
            />
            <span>Показывать переводы между счетами в статистике</span>
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={autoDetectDuplicates}
              onChange={(e) => setAutoDetectDuplicates(e.target.checked)}
            />
            <span>Автоматически определять дубликаты</span>
          </label>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="recentTransactionsDays">Период &quot;недавних&quot; транзакций</label>
          <select
            id="recentTransactionsDays"
            value={recentTransactionsDays}
            onChange={(e) => setRecentTransactionsDays(Number(e.target.value))}
            className={styles.select}
          >
            <option value="7">7 дней</option>
            <option value="14">14 дней</option>
            <option value="30">30 дней</option>
          </select>
        </div>
      </section>

      {/* Уведомления */}
      <section className={styles.section}>
        <h2><span className="material-icons">notifications</span>Уведомления</h2>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={notifyBudgetExceed}
              onChange={(e) => setNotifyBudgetExceed(e.target.checked)}
            />
            <span>Уведомлять о превышении бюджета</span>
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={weeklySummary}
              onChange={(e) => setWeeklySummary(e.target.checked)}
            />
            <span>Еженедельная сводка</span>
          </label>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="remindRecurringDays">Напоминать о регулярных платежах за</label>
            <select
              id="remindRecurringDays"
              value={remindRecurringDays}
              onChange={(e) => setRemindRecurringDays(Number(e.target.value))}
              className={styles.select}
            >
              <option value="1">1 день</option>
              <option value="3">3 дня</option>
              <option value="7">7 дней</option>
            </select>
          </div>

          {weeklySummary && (
            <div className={styles.formGroup}>
              <label htmlFor="weeklySummaryDay">День недели для сводки</label>
              <select
                id="weeklySummaryDay"
                value={weeklySummaryDay}
                onChange={(e) => setWeeklySummaryDay(e.target.value)}
                className={styles.select}
              >
                <option value="monday">Понедельник</option>
                <option value="tuesday">Вторник</option>
                <option value="wednesday">Среда</option>
                <option value="thursday">Четверг</option>
                <option value="friday">Пятница</option>
                <option value="saturday">Суббота</option>
                <option value="sunday">Воскресенье</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Отчеты */}
      <section className={styles.section}>
        <h2><span className="material-icons">assessment</span>Отчеты</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="defaultReportPeriod">Период отчетов по умолчанию</label>
            <select
              id="defaultReportPeriod"
              value={defaultReportPeriod}
              onChange={(e) => setDefaultReportPeriod(e.target.value)}
              className={styles.select}
            >
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
              <option value="quarter">Квартал</option>
              <option value="year">Год</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="chartGrouping">Группировка в графиках</label>
            <select
              id="chartGrouping"
              value={chartGrouping}
              onChange={(e) => setChartGrouping(e.target.value)}
              className={styles.select}
            >
              <option value="days">По дням</option>
              <option value="weeks">По неделям</option>
              <option value="months">По месяцам</option>
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Исключить категории из отчетов</label>
          <div className={styles.categoriesGrid}>
            {categories.map((category) => (
              <label key={category.id} className={styles.categoryCheckbox}>
                <input
                  type="checkbox"
                  checked={excludeCategories.includes(category.id)}
                  onChange={() => toggleExcludeCategory(category.id)}
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Интерфейс */}
      <section className={styles.section}>
        <h2><span className="material-icons">palette</span>Интерфейс</h2>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={showZeroBalances}
              onChange={(e) => setShowZeroBalances(e.target.checked)}
            />
            <span>Показывать нулевые балансы</span>
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={groupTransactionsByDate}
              onChange={(e) => setGroupTransactionsByDate(e.target.checked)}
            />
            <span>Группировать транзакции по дате</span>
          </label>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="dashboardAccounts">Показывать счета на главной</label>
            <select
              id="dashboardAccounts"
              value={dashboardAccounts}
              onChange={(e) => setDashboardAccounts(e.target.value)}
              className={styles.select}
            >
              <option value="all">Все счета</option>
              <option value="favorites">Только избранные</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="chartColorScheme">Цветовая схема графиков</label>
            <select
              id="chartColorScheme"
              value={chartColorScheme}
              onChange={(e) => setChartColorScheme(e.target.value)}
              className={styles.select}
            >
              <option value="standard">Стандартная</option>
              <option value="pastel">Пастельная</option>
              <option value="bright">Яркая</option>
            </select>
          </div>
        </div>
      </section>

      {/* Автоматизация */}
      <section className={styles.section}>
        <h2><span className="material-icons">auto_awesome</span>Автоматизация</h2>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={autoCategorizationEnabled}
              onChange={(e) => setAutoCategorizationEnabled(e.target.checked)}
            />
            <span>Автокатегоризация новых транзакций</span>
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={autoRecurringEnabled}
              onChange={(e) => setAutoRecurringEnabled(e.target.checked)}
            />
            <span>Автоматическое создание регулярных платежей</span>
          </label>
        </div>
      </section>

      {/* Кнопка сохранения */}
      <div className={styles.actions}>
        <button
          onClick={handleSave}
          disabled={saving}
          className={styles.saveButton}
        >
          {saving ? "Сохранение..." : "Сохранить все изменения"}
        </button>

        {message && (
          <div className={message.includes("Ошибка") ? styles.error : styles.success}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
