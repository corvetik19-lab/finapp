"use client";

import { useState } from "react";
import styles from "@/components/budgets/Budgets.module.css";
import { BudgetWithUsage } from "@/lib/budgets/service";
import { formatMoney } from "@/lib/utils/format";
import { deleteBudget, updateBudget } from "@/app/(protected)/budgets/actions";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  kind: "income" | "expense" | "transfer";
};

type BudgetsListProps = {
  budgets: BudgetWithUsage[];
  categories: Category[];
};

function formatDate(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BudgetsList({ budgets, categories }: BudgetsListProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    category_id: string;
    period_start: string;
    period_end: string;
    limit_amount: string;
    currency: string;
  } | null>(null);

  const handleEdit = (budget: BudgetWithUsage) => {
    setEditingId(budget.id);
    setEditForm({
      category_id: budget.category_id ?? "",
      period_start: budget.period_start,
      period_end: budget.period_end,
      limit_amount: String(budget.limit_major),
      currency: budget.currency,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async (budgetId: string) => {
    if (!editForm) return;

    try {
      const formData = new FormData();
      formData.append("id", budgetId);
      formData.append("category_id", editForm.category_id);
      formData.append("period_start", editForm.period_start);
      formData.append("period_end", editForm.period_end);
      formData.append("limit_amount", editForm.limit_amount);
      formData.append("currency", editForm.currency);

      await updateBudget(formData);
      setEditingId(null);
      setEditForm(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to update budget:", error);
      alert("Не удалось обновить бюджет");
    }
  };

  const handleDelete = async (budgetId: string) => {
    if (!window.confirm("Удалить бюджет?")) return;

    try {
      const formData = new FormData();
      formData.append("id", budgetId);
      await deleteBudget(formData);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete budget:", error);
      alert("Не удалось удалить бюджет");
    }
  };

  if (budgets.length === 0) {
    return <div className={styles.empty}>Бюджеты ещё не настроены. Создайте первый лимит в форме выше.</div>;
  }

  return (
    <>
      {budgets.map((budget) => {
        const cardClass =
          budget.status === "over"
            ? `${styles.card} ${styles.statusOver}`
            : budget.status === "warning"
              ? `${styles.card} ${styles.statusWarning}`
              : `${styles.card} ${styles.statusOk}`;

        const isEditing = editingId === budget.id;

        return (
          <div key={budget.id} className={cardClass}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>{budget.category?.name ?? "Без категории"}</div>
                <div className={styles.cardPeriod}>
                  {formatDate(budget.period_start)} — {formatDate(budget.period_end)}
                </div>
              </div>
              <div className={styles.actions}>
                {!isEditing && (
                  <>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => handleEdit(budget)}
                    >
                      <span className="material-icons" aria-hidden>
                        edit
                      </span>
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(budget.id)}
                    >
                      <span className="material-icons" aria-hidden>
                        delete
                      </span>
                      Удалить
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing && editForm ? (
              <div className={styles.editForm}>
                <div className={styles.editFormGrid}>
                  <label>
                    <span className={styles.label}>Категория</span>
                    <select
                      className={styles.select}
                      value={editForm.category_id}
                      onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                    >
                      <option value="">— выберите категорию —</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={styles.label}>Дата начала</span>
                    <input
                      type="date"
                      className={styles.input}
                      value={editForm.period_start}
                      onChange={(e) => setEditForm({ ...editForm, period_start: e.target.value })}
                    />
                  </label>
                  <label>
                    <span className={styles.label}>Дата окончания</span>
                    <input
                      type="date"
                      className={styles.input}
                      value={editForm.period_end}
                      onChange={(e) => setEditForm({ ...editForm, period_end: e.target.value })}
                    />
                  </label>
                  <label>
                    <span className={styles.label}>Лимит (₽)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.input}
                      value={editForm.limit_amount}
                      onChange={(e) => setEditForm({ ...editForm, limit_amount: e.target.value })}
                    />
                  </label>
                </div>
                <div className={styles.editFormActions}>
                  <button type="button" className={styles.secondaryBtn} onClick={handleCancelEdit}>
                    Отмена
                  </button>
                  <button type="button" className={styles.primaryBtn} onClick={() => handleSaveEdit(budget.id)}>
                    <span className="material-icons" aria-hidden>
                      save
                    </span>
                    Сохранить
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.cardAmounts}>
                  <div className={styles.amountItem}>
                    <span className={styles.amountLabel}>Лимит</span>
                    <span className={styles.amountValue}>{formatMoney(budget.limit_minor, budget.currency)}</span>
                  </div>
                  <div className={styles.amountItem}>
                    <span className={styles.amountLabel}>Потрачено</span>
                    <span className={styles.amountValue}>{formatMoney(budget.spent_minor, budget.currency)}</span>
                  </div>
                  <div className={styles.amountItem}>
                    <span className={styles.amountLabel}>{budget.remaining_minor >= 0 ? "Остаток" : "Перерасход"}</span>
                    <span className={styles.amountValue}>{formatMoney(budget.remaining_minor, budget.currency)}</span>
                  </div>
                </div>

                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${Math.min(Math.max(budget.progress, 0), 1) * 100}%` }}
                  />
                </div>

                <div
                  className={`${styles.statusLine} ${
                    budget.status === "over"
                      ? styles.statusLineOver
                      : budget.status === "warning"
                        ? styles.statusLineWarning
                        : styles.statusLineOk
                  }`}
                >
                  <span
                    className={`${styles.statusDot} ${
                      budget.status === "over"
                        ? styles.statusDotOver
                        : budget.status === "warning"
                          ? styles.statusDotWarning
                          : styles.statusDotOk
                    }`}
                  />
                  {budget.status === "over"
                    ? "Лимит превышен"
                    : budget.status === "warning"
                      ? "Осталось менее 15%"
                      : "В пределах лимита"}
                </div>
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
