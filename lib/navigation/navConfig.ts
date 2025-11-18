import type { NavConfig } from "@/lib/auth/filterNavigation";

export const NAV_CONFIG: NavConfig[] = [
  { label: "Дашборд", href: "/finance/dashboard", icon: "insights", requiredPermission: "dashboard:view" },
  { label: "Достижения", href: "/achievements", icon: "emoji_events", requiredPermission: "dashboard:view" },
  
  {
    label: "Карты",
    icon: "credit_card",
    requiredPermission: "transactions:view",
    items: [
      { label: "Дебетовые карты", href: "/finance/cards", icon: "payment", requiredPermission: "transactions:view" },
      { label: "Кредитные карты", href: "/finance/credit-cards", icon: "credit_card", requiredPermission: "transactions:view" },
    ]
  },
  
  {
    label: "Финансы",
    icon: "account_balance_wallet",
    requiredPermission: "transactions:view",
    items: [
      { label: "Транзакции", href: "/finance/transactions", icon: "list", requiredPermission: "transactions:view" },
      { label: "Кредиты", href: "/finance/loans", icon: "account_balance", requiredPermission: "transactions:view" },
      { label: "Платежи", href: "/finance/payments", icon: "receipt_long", requiredPermission: "transactions:view" },
      { label: "Бюджеты", href: "/finance/budgets", icon: "pie_chart", requiredPermission: "budgets:view" },
      { label: "Планы", href: "/finance/plans", icon: "flag", requiredPermission: "plans:view" },
    ]
  },
  
  {
    label: "Отчёты",
    icon: "assessment",
    requiredPermission: "reports:view",
    items: [
      { label: "Отчёты", href: "/finance/reports", icon: "query_stats", requiredPermission: "reports:view" },
      { label: "Прогнозы", href: "/finance/forecasts", icon: "trending_up", requiredPermission: "reports:view" },
      { label: "Расширенная аналитика", href: "/finance/analytics/advanced", icon: "analytics", requiredPermission: "reports:view" },
    ]
  },
  
  {
    label: "AI",
    icon: "psychology",
    requiredPermission: "dashboard:view",
    items: [
      { label: "AI Советник", href: "/ai-advisor", icon: "lightbulb", requiredPermission: "dashboard:view" },
      { label: "AI Чат", href: "/ai-chat", icon: "smart_toy", requiredPermission: "dashboard:view" },
      { label: "AI Аналитика", href: "/ai-analytics", icon: "psychology", requiredPermission: "dashboard:view" },
    ]
  },
  
  {
    label: "Личное",
    icon: "folder",
    requiredPermission: "dashboard:view",
    items: [
      { label: "Заметки", href: "/personal/notes", icon: "sticky_note_2", requiredPermission: "dashboard:view" },
      { label: "Задачи", href: "/personal/tasks", icon: "check_circle", requiredPermission: "dashboard:view" },
      { label: "Календарь", href: "/personal/calendar", icon: "calendar_month", requiredPermission: "dashboard:view" },
      { label: "Закладки", href: "/personal/bookmarks", icon: "bookmark", requiredPermission: "dashboard:view" },
      { label: "Промпты", href: "/personal/prompts", icon: "lightbulb", requiredPermission: "dashboard:view" },
      { label: "Фитнес", href: "/personal/fitness", icon: "fitness_center", requiredPermission: "dashboard:view" },
    ]
  },
  { label: "Уведомления", href: "/notifications", icon: "notifications_active" },
  { label: "Настройки", href: "/settings", icon: "settings", requiredPermission: "settings:view" },
];
