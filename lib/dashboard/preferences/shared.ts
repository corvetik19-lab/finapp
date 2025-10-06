export const CATEGORY_WIDGET_KEY = "category-management";
export const WIDGET_VISIBILITY_KEY = "widget-visibility";

export type CategoryWidgetPreferencesState = {
  visibleIds: string[];
};

// Ключи виджетов дашборда
export const DASHBOARD_WIDGETS = {
  NET_WORTH: "net-worth",
  PLANS: "plans",
  UPCOMING_PAYMENTS: "upcoming-payments",
  RECENT_NOTES: "recent-notes",
  BUDGET: "budget",
  FINANCIAL_TRENDS: "financial-trends",
  EXPENSE_BY_CATEGORY: "expense-by-category",
  CATEGORY_MANAGEMENT: "category-management",
} as const;

export type DashboardWidgetKey = typeof DASHBOARD_WIDGETS[keyof typeof DASHBOARD_WIDGETS];

// Настройки видимости виджетов
export type WidgetVisibilityState = {
  hidden: DashboardWidgetKey[];
};

// Информация о виджетах для отображения в настройках
export const WIDGET_INFO: Record<DashboardWidgetKey, { title: string; description: string; icon: string }> = {
  [DASHBOARD_WIDGETS.NET_WORTH]: {
    title: "Чистые активы",
    description: "Обзор ваших активов и долгов",
    icon: "account_balance",
  },
  [DASHBOARD_WIDGETS.PLANS]: {
    title: "Планы",
    description: "Финансовые цели и прогресс",
    icon: "flag",
  },
  [DASHBOARD_WIDGETS.UPCOMING_PAYMENTS]: {
    title: "Предстоящие платежи",
    description: "Напоминания о счетах",
    icon: "receipt_long",
  },
  [DASHBOARD_WIDGETS.RECENT_NOTES]: {
    title: "Последние заметки",
    description: "Быстрый доступ к записям",
    icon: "sticky_note_2",
  },
  [DASHBOARD_WIDGETS.BUDGET]: {
    title: "Бюджет на месяц",
    description: "Контроль расходов",
    icon: "account_balance_wallet",
  },
  [DASHBOARD_WIDGETS.FINANCIAL_TRENDS]: {
    title: "Финансовые тенденции",
    description: "Динамика доходов и расходов",
    icon: "trending_up",
  },
  [DASHBOARD_WIDGETS.EXPENSE_BY_CATEGORY]: {
    title: "Расходы по категориям",
    description: "Распределение расходов",
    icon: "pie_chart",
  },
  [DASHBOARD_WIDGETS.CATEGORY_MANAGEMENT]: {
    title: "Управление категориями",
    description: "Быстрый доступ к категориям",
    icon: "category",
  },
};

export function normalizeWidgetVisibleIds(
  ids: unknown,
  allowed?: Set<string>
): string[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of ids) {
    if (typeof value !== "string") continue;
    if (seen.has(value)) continue;
    if (allowed && !allowed.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}

export function normalizeHiddenWidgets(hidden: unknown): DashboardWidgetKey[] {
  if (!Array.isArray(hidden)) {
    return [];
  }

  const validWidgets = new Set(Object.values(DASHBOARD_WIDGETS));
  const result: DashboardWidgetKey[] = [];
  const seen = new Set<string>();

  for (const value of hidden) {
    if (typeof value !== "string") continue;
    if (seen.has(value)) continue;
    if (!validWidgets.has(value as DashboardWidgetKey)) continue;
    seen.add(value);
    result.push(value as DashboardWidgetKey);
  }

  return result;
}
