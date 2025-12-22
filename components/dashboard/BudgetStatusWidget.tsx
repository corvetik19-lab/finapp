import type { BudgetWithUsage } from "@/lib/budgets/service";
import { formatMoney } from "@/lib/utils/format";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, Loader2, BookmarkPlus } from "lucide-react";

// Статусы для расходов
const EXPENSE_STATUS_LABEL: Record<BudgetWithUsage["status"], string> = {
  ok: "В пределах",
  warning: "Почти лимит",
  over: "Перерасход",
};

// Статусы для доходов
const INCOME_STATUS_LABEL: Record<BudgetWithUsage["status"], string> = {
  ok: "План не выполнен",
  warning: "Близко к плану",
  over: "✓ План выполнен",
};

const EXPENSE_STATUS_COLORS: Record<BudgetWithUsage["status"], string> = {
  ok: "text-green-600 bg-green-100",
  warning: "text-yellow-600 bg-yellow-100",
  over: "text-red-600 bg-red-100",
};

const INCOME_STATUS_COLORS: Record<BudgetWithUsage["status"], string> = {
  ok: "text-blue-600 bg-blue-100",
  warning: "text-blue-600 bg-blue-100",
  over: "text-green-600 bg-green-100",
};

type BudgetStatusWidgetProps = {
  budgets: BudgetWithUsage[];
  currency: string;
  onDelete?: (id: string) => void;
  deletingId?: string | null;
};

export default function BudgetStatusWidget({ budgets, currency, onDelete, deletingId }: BudgetStatusWidgetProps) {
  if (!budgets || budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <BookmarkPlus className="h-8 w-8 mb-2" />
        <p className="text-sm">Создайте первый бюджет для отслеживания лимитов</p>
      </div>
    );
  }

  const sorted = [...budgets].sort((a, b) => b.progress - a.progress);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sorted.map((budget) => {
        const categoryName = budget.category?.name || "Без категории";
        const isIncome = budget.category?.kind === "income" || budget.category?.kind === "both";
        const statusLabel = isIncome ? INCOME_STATUS_LABEL[budget.status] : EXPENSE_STATUS_LABEL[budget.status];
        const statusColors = isIncome ? INCOME_STATUS_COLORS[budget.status] : EXPENSE_STATUS_COLORS[budget.status];
        const progressPct = Math.min(Math.max(budget.progress * 100, 0), 100);

        const periodStart = new Date(budget.period_start).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
        const periodEnd = new Date(budget.period_end).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
        
        // Для доходов: зелёный прогресс-бар, для расходов - красный при превышении
        const progressBarClass = isIncome 
          ? "[&>div]:bg-green-500"
          : budget.status === "over" ? "[&>div]:bg-red-500" : budget.status === "warning" ? "[&>div]:bg-yellow-500" : "";

        return (
          <div key={budget.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{categoryName}</span>
                <span className="text-xs text-muted-foreground ml-2">{periodStart} — {periodEnd}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{formatMoney(budget.limit_minor, budget.currency || currency)}</span>
                {onDelete && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(budget.id)} disabled={deletingId === budget.id}>
                    {deletingId === budget.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>
            <Progress value={progressPct} className={`h-1.5 ${progressBarClass}`} />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {isIncome ? "Получено" : "Потрачено"}: {formatMoney(budget.spent_minor, budget.currency || currency)}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-xs ${statusColors}`}>
                {statusLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
