"use client";

import type { Report } from "@/lib/reports/types";
import { formatDate } from "@/lib/reports/utils";
import styles from "./ReportsList.module.css";

type ReportsListProps = {
  reports: Report[];
  onSelect?: (report: Report) => void;
  onDelete?: (reportId: string) => void;
};

const getIconForCategory = (category: string): string => {
  const icons: Record<string, string> = {
    "Финансовые отчеты": "assessment",
    "Доходы/Расходы": "pie_chart",
    "Отчеты по картам": "credit_card",
    "Отчеты по кредитам": "money",
    "Пользовательские": "show_chart",
  };
  return icons[category] || "assessment";
};

export default function ReportsList({ reports, onSelect, onDelete }: ReportsListProps) {
  if (reports.length === 0) {
    return (
      <div className={styles.empty}>
        <span className="material-icons">folder_open</span>
        <p>Нет сохранённых отчётов</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {reports.map((report) => (
        <div
          key={report.id}
          className={styles.item}
          onClick={() => onSelect && onSelect(report)}
        >
          <div className={styles.info}>
            <div className={styles.icon}>
              <span className="material-icons">
                {getIconForCategory(report.category)}
              </span>
            </div>
            <div className={styles.details}>
              <div className={styles.name}>{report.name}</div>
              <div className={styles.meta}>
                {report.category} • {report.format.toUpperCase()}
              </div>
              <div className={styles.filters}>
                <span className={styles.badge}>
                  {report.period === "today" ? "Сегодня" :
                   report.period === "week" ? "Неделя" :
                   report.period === "month" ? "Месяц" :
                   report.period === "quarter" ? "Квартал" :
                   report.period === "year" ? "Год" : "Произвольный"}
                </span>
                {report.dataTypes && report.dataTypes.length > 0 && (
                  <span className={styles.badge}>
                    {report.dataTypes.map(t => 
                      t === "income" ? "Доходы" :
                      t === "expense" ? "Расходы" :
                      t === "loans" ? "Кредиты" : "Карты"
                    ).join(", ")}
                  </span>
                )}
                {report.categories && report.categories.length > 0 && (
                  <span className={styles.badge}>
                    {report.categories.length} {report.categories.length === 1 ? 'категория' : 'категорий'}
                  </span>
                )}
                {report.accounts && report.accounts.length > 0 && (
                  <span className={styles.badge}>
                    {report.accounts.length} {report.accounts.length === 1 ? 'счёт' : 'счетов'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={styles.actions}>
            <div className={styles.date}>{formatDate(report.createdAt)}</div>
            {onDelete && (
              <button
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Удалить этот отчёт?")) {
                    onDelete(report.id);
                  }
                }}
                title="Удалить"
              >
                <span className="material-icons">delete</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
