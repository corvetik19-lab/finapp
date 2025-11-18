"use client";

import { useEffect, useState } from "react";
import BudgetStatusWidget from "@/components/dashboard/BudgetStatusWidget";
import styles from "@/components/dashboard/Dashboard.module.css";
import { BudgetWithUsage } from "@/lib/budgets/service";
import BudgetQuickAddForm from "@/components/dashboard/BudgetQuickAddForm";
import { CategoryRecord } from "@/lib/categories/service";
import { deleteBudgetAction } from "@/app/(protected)/finance/dashboard/actions";

export type BudgetSectionProps = {
  budgets: BudgetWithUsage[];
  categories: CategoryRecord[];
  currency: string;
};

export default function BudgetSection({ budgets, categories, currency }: BudgetSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [localBudgets, setLocalBudgets] = useState<BudgetWithUsage[]>(budgets);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLocalBudgets(budgets);
  }, [budgets]);

  const handleSuccess = (budget: BudgetWithUsage) => {
    setLocalBudgets((prev) => [budget, ...prev.filter((item) => item.id !== budget.id)]);
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Удалить бюджет?")) return;

    setDeletingId(id);
    try {
      const result = await deleteBudgetAction(id);
      if (result.success) {
        setLocalBudgets((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert(result.error || "Не удалось удалить бюджет");
      }
    } catch (error) {
      console.error(error);
      alert("Не удалось удалить бюджет");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className={styles.budgetSection}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <span className="material-icons" aria-hidden>
            account_balance_wallet
          </span>
          Бюджет на месяц
        </div>
        <div className={styles.sectionActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setIsFormOpen((prev) => !prev)}
          >
            <span className="material-icons" aria-hidden>
              {isFormOpen ? "close" : "add"}
            </span>
            {isFormOpen ? "Отмена" : "Добавить бюджет"}
          </button>
        </div>
      </div>

      {isFormOpen && (
        <BudgetQuickAddForm
          currency={currency}
          categories={categories}
          onSuccess={handleSuccess}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      <BudgetStatusWidget
        budgets={localBudgets}
        currency={currency}
        onDelete={handleDelete}
        deletingId={deletingId}
      />
    </section>
  );
}
