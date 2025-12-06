// Конфигурация режимов платформы (без "use server" - можно импортировать на клиенте)

export const ALL_MODES = [
  { key: "finance", label: "Финансы", icon: "💰", description: "Учёт доходов и расходов" },
  { key: "tenders", label: "Тендеры", icon: "📋", description: "Управление тендерами" },
  { key: "personal", label: "Личные", icon: "🎯", description: "Личные цели и планы" },
  { key: "investments", label: "Инвестиции", icon: "📈", description: "Инвестиционный портфель" },
] as const;

export type AppModeKey = typeof ALL_MODES[number]["key"];

export type ModeInfo = typeof ALL_MODES[number];
