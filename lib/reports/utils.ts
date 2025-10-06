import type { ReportPeriod } from "./types";

/**
 * Получить даты начала и конца периода
 */
export function getPeriodDates(period: ReportPeriod, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  let from: Date;
  let to: Date;

  switch (period) {
    case "month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;

    case "last_month":
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
      break;

    case "quarter":
      const currentQuarter = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), currentQuarter * 3, 1);
      to = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
      break;

    case "year":
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
      break;

    case "custom":
      if (!customFrom || !customTo) {
        // Fallback to current month
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else {
        from = new Date(customFrom);
        to = new Date(customTo);
      }
      break;

    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

/**
 * Форматирование периода для отображения
 */
export function formatPeriod(period: ReportPeriod, dateFrom?: string | null, dateTo?: string | null): string {
  switch (period) {
    case "month":
      return "Текущий месяц";
    case "last_month":
      return "Прошлый месяц";
    case "quarter":
      return "Текущий квартал";
    case "year":
      return "Текущий год";
    case "custom":
      if (dateFrom && dateTo) {
        return `${formatDate(dateFrom)} — ${formatDate(dateTo)}`;
      }
      return "Произвольный период";
    default:
      return period;
  }
}

/**
 * Форматирование даты для отображения
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  
  const d = new Date(date);
  
  // Проверка на Invalid Date
  if (isNaN(d.getTime())) {
    return "—";
  }
  
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Форматирование суммы в рубли
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Конвертация копеек в рубли
 */
export function minorToMajor(minor: number): number {
  return minor / 100;
}

/**
 * Генерация цвета для категории (по хешу имени)
 */
export function getCategoryColor(categoryName: string): string {
  const colors = [
    "#1565c0", "#43a047", "#e53935", "#fb8c00",
    "#8e24aa", "#00acc1", "#fdd835", "#c0ca33",
    "#6d4c41", "#546e7a", "#d81b60", "#f4511e",
  ];
  
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Экспорт данных в CSV
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
