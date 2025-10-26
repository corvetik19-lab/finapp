import type { NavConfig } from "@/lib/auth/filterNavigation";

export const NAV_CONFIG: NavConfig[] = [
  { label: "Дашборд", href: "/dashboard", icon: "insights", requiredPermission: "dashboard:view" },
  { label: "Достижения", href: "/achievements", icon: "emoji_events", requiredPermission: "dashboard:view" },
  
  {
    label: "Карты",
    icon: "credit_card",
    requiredPermission: "transactions:view",
    items: [
      { label: "Дебетовые карты", href: "/cards", icon: "payment", requiredPermission: "transactions:view" },
      { label: "Кредитные карты", href: "/credit-cards", icon: "credit_card", requiredPermission: "transactions:view" },
    ]
  },
  
  {
    label: "Финансы",
    icon: "account_balance_wallet",
    requiredPermission: "transactions:view",
    items: [
      { label: "Транзакции", href: "/transactions", icon: "list", requiredPermission: "transactions:view" },
      { label: "Кредиты", href: "/loans", icon: "account_balance", requiredPermission: "transactions:view" },
      { label: "Платежи", href: "/payments", icon: "receipt_long", requiredPermission: "transactions:view" },
      { label: "Бюджеты", href: "/budgets", icon: "pie_chart", requiredPermission: "budgets:view" },
    ]
  },
  
  {
    label: "Отчёты",
    icon: "assessment",
    requiredPermission: "reports:view",
    items: [
      { label: "Отчёты", href: "/reports", icon: "query_stats", requiredPermission: "reports:view" },
      { label: "Прогнозы", href: "/forecasts", icon: "trending_up", requiredPermission: "reports:view" },
      { label: "Расширенная аналитика", href: "/analytics/advanced", icon: "analytics", requiredPermission: "reports:view" },
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
      { label: "Заметки", href: "/notes", icon: "sticky_note_2", requiredPermission: "dashboard:view" },
      { label: "Планы", href: "/plans", icon: "flag", requiredPermission: "dashboard:view" },
      { label: "Закладки", href: "/bookmarks", icon: "bookmark", requiredPermission: "dashboard:view" },
      { label: "Промпты", href: "/prompts", icon: "lightbulb", requiredPermission: "dashboard:view" },
    ]
  },
  
  { label: "Фитнес", href: "/fitness", icon: "fitness_center", requiredPermission: "dashboard:view" },
  { label: "Уведомления", href: "/notifications", icon: "notifications_active" },
  { label: "Настройки", href: "/settings", icon: "settings", requiredPermission: "settings:view" },
];
