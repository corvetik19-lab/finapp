"use client";

import type { Report } from "@/lib/reports/types";
import { formatDate } from "@/lib/reports/utils";
import { Button } from "@/components/ui/button";
import { BarChart3, PieChart, CreditCard, Banknote, LineChart, FolderOpen, Trash2 } from "lucide-react";

type ReportsListProps = {
  reports: Report[];
  onSelect?: (report: Report) => void;
  onDelete?: (reportId: string) => void;
};

const getIconForCategory = (category: string) => {
  const icons: Record<string, React.ReactNode> = {
    "Финансовые отчеты": <BarChart3 className="h-5 w-5" />,
    "Доходы/Расходы": <PieChart className="h-5 w-5" />,
    "Отчеты по картам": <CreditCard className="h-5 w-5" />,
    "Отчеты по кредитам": <Banknote className="h-5 w-5" />,
    "Пользовательские": <LineChart className="h-5 w-5" />,
  };
  return icons[category] || <BarChart3 className="h-5 w-5" />;
};

export default function ReportsList({ reports, onSelect, onDelete }: ReportsListProps) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FolderOpen className="h-12 w-12 mb-3 opacity-50" />
        <p>Нет сохранённых отчётов</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <div
          key={report.id}
          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => onSelect && onSelect(report)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">{getIconForCategory(report.category)}</div>
            <div>
              <div className="font-medium">{report.name}</div>
              <div className="text-sm text-muted-foreground">{report.category} • {report.format.toUpperCase()}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                  {report.period === "today" ? "Сегодня" :
                   report.period === "week" ? "Текущая неделя" :
                   report.period === "month" ? "Текущий месяц" :
                   report.period === "quarter" ? "Текущий квартал" :
                   report.period === "year" ? "Текущий год" : "Произвольный период"}
                </span>
                {report.dataTypes && report.dataTypes.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                    {report.dataTypes.map(t => t === "income" ? "Доходы" : t === "expense" ? "Расходы" : t === "loans" ? "Кредиты" : "Карты").join(", ")}
                  </span>
                )}
                {report.categories && report.categories.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-muted">{report.categories.length} {report.categories.length === 1 ? 'категория' : 'категорий'}</span>
                )}
                {report.accounts && report.accounts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-muted">{report.accounts.length} {report.accounts.length === 1 ? 'счёт' : 'счетов'}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{formatDate(report.createdAt)}</span>
            {onDelete && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm("Удалить этот отчёт?")) onDelete(report.id); }} title="Удалить">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
