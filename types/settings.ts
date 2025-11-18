/**
 * Типы для настроек режимов
 */

export interface FinanceSettings {
  // Основные настройки
  currency?: string;
  dateFormat?: string;
  firstDayOfWeek?: string;
  
  // Настройки бюджета
  budgetPeriod?: string;
  budgetWarningType?: string;
  budgetWarningValue?: number;
  
  // Транзакции
  showTransfersInStats?: boolean;
  autoDetectDuplicates?: boolean;
  recentTransactionsDays?: number;
  
  // Категории
  defaultIncomeCategory?: string;
  defaultExpenseCategory?: string;
  allowedCategories?: string[];
  
  // Отчёты
  defaultReportPeriod?: string;
  includeSubcategories?: boolean;
  excludeCategories?: string[];
  chartGrouping?: string;
  
  // Уведомления
  notifyBudgetExceeded?: boolean;
  notifyBudgetExceed?: boolean;
  notifyLowBalance?: boolean;
  lowBalanceThreshold?: number;
  remindRecurringDays?: number;
  weeklySummary?: boolean;
  weeklySummaryDay?: string;
  
  // Планы
  defaultPlanType?: string;
  showCompletedPlans?: boolean;
  
  // Экспорт
  defaultExportFormat?: string;
  includeAttachments?: boolean;
  
  // Интерфейс
  showZeroBalances?: boolean;
  groupTransactionsByDate?: boolean;
  dashboardAccounts?: string;
  chartColorScheme?: string;
  
  // Автоматизация
  autoCategorizationEnabled?: boolean;
  autoRecurringEnabled?: boolean;
  suggestCategories?: boolean;
  
  // Приватность
  requirePasswordForExport?: boolean;
  hideAmountsInNotifications?: boolean;
  
  // Дополнительные поля
  [key: string]: string | number | boolean | string[] | undefined;
}

export type ModeSettings = FinanceSettings;
