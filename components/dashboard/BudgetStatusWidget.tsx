import styles from "./BudgetStatusWidget.module.css";
import type { BudgetWithUsage } from "@/lib/budgets/service";
import { formatMoney } from "@/lib/utils/format";

const ICON_MAP: Record<string, string> = {
  food: "restaurant",
  grocery: "shopping_basket",
  transport: "directions_car",
  car: "directions_car",
  entertainment: "theaters",
  travel: "flight",
  health: "local_hospital",
  sport: "fitness_center",
  education: "school",
  utilities: "bolt",
  home: "home",
  housing: "home",
  personal: "person",
};

const STATUS_LABEL: Record<BudgetWithUsage["status"], string> = {
  ok: "В пределах",
  warning: "Почти лимит",
  over: "Перерасход",
};

const STATUS_PROGRESS_CLASS: Record<BudgetWithUsage["status"], string> = {
  ok: styles.progressOk,
  warning: styles.progressWarning,
  over: styles.progressOver,
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
      <div className={styles.emptyState}>
        <div className="material-icons" aria-hidden>
          bookmark_add
        </div>
        <div>Создайте первый бюджет, чтобы отслеживать лимиты по категориям.</div>
      </div>
    );
  }

  const sorted = [...budgets].sort((a, b) => b.progress - a.progress);

  return (
    <div className={styles.budgetGrid}>
      {sorted.map((budget) => {
        const categoryName = budget.category?.name || "Без категории";
        const iconKey = categoryName.toLowerCase();
        const icon = ICON_MAP[iconKey] || ICON_MAP[budget.category?.kind || ""] || "category";
        const statusLabel = STATUS_LABEL[budget.status];
        const progressPct = Math.min(Math.max(budget.progress * 100, 0), 120);

        const periodStart = new Date(budget.period_start).toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "short",
        });
        const periodEnd = new Date(budget.period_end).toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "short",
        });

        return (
          <article key={budget.id} className={styles.budgetCard}>
            <header className={styles.budgetHeader}>
              <div className={styles.budgetCategory}>
                <span className={`material-icons ${styles.budgetIcon}`} aria-hidden>
                  {icon}
                </span>
                <span className={styles.categoryName}>{categoryName}</span>
              </div>
              <div className={styles.budgetActions}>
                <div className={styles.budgetAmount}>{formatMoney(budget.limit_minor, budget.currency || currency)}</div>
                {onDelete && (
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => onDelete(budget.id)}
                    disabled={deletingId === budget.id}
                    aria-label="Удалить бюджет"
                  >
                    <span className="material-icons" aria-hidden>
                      {deletingId === budget.id ? "hourglass_top" : "close"}
                    </span>
                  </button>
                )}
              </div>
            </header>

            <div className={styles.budgetPeriod}>
              {periodStart} — {periodEnd}
            </div>

            <div className={styles.progressBar}>
              <div
                className={`${styles.progressFill} ${STATUS_PROGRESS_CLASS[budget.status]}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className={styles.budgetDetails}>
              <span className={styles.budgetSpent}>
                Потрачено: {formatMoney(budget.spent_minor, budget.currency || currency)}
              </span>
              <span className={styles.budgetRemaining}>
                Осталось: {formatMoney(budget.remaining_minor, budget.currency || currency)}
              </span>
              <span className={styles.budgetStatus}>{statusLabel}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
