"use client";

import { useState } from "react";
import styles from "@/components/budgets/Budgets.module.css";
import { BudgetWithUsage } from "@/lib/budgets/service";
import { formatMoney } from "@/lib/utils/format";
import { deleteBudget, updateBudget } from "@/app/(protected)/finance/budgets/actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastContext";

type Category = {
  id: string;
  name: string;
  kind: "income" | "expense" | "transfer" | "both";
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
  const { show: showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    category_id: string;
    period_start: string;
    period_end: string;
    limit_amount: string;
    currency: string;
    notes: string;
  } | null>(null);

  const handleEdit = (budget: BudgetWithUsage) => {
    setEditingId(budget.id);
    setEditForm({
      category_id: budget.category_id ?? "",
      period_start: budget.period_start,
      period_end: budget.period_end,
      limit_amount: String(budget.limit_major),
      currency: budget.currency,
      notes: budget.notes ?? "",
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
      formData.append("notes", editForm.notes);

      await updateBudget(formData);
      setEditingId(null);
      setEditForm(null);
      showToast("✅ Бюджет успешно обновлен", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Failed to update budget:", error);
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      showToast(`❌ Ошибка: ${errorMessage}`, { type: "error" });
    }
  };

  const handleDelete = async (budgetId: string) => {
    if (!window.confirm("Удалить бюджет?")) return;

    try {
      const formData = new FormData();
      formData.append("id", budgetId);
      console.log("Attempting to delete budget:", budgetId);
      await deleteBudget(formData);
      console.log("Budget deleted, refreshing...");
      showToast("✅ Бюджет успешно удален", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Failed to delete budget:", error);
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      showToast(`❌ Ошибка: ${errorMessage}`, { type: "error" });
    }
  };

  if (budgets.length === 0) {
    return <div className={styles.empty}>Бюджеты ещё не настроены. Создайте первый лимит в форме выше.</div>;
  }

  // Группируем бюджеты
  const incomeBudgets = budgets.filter(b => b.category?.kind === "income" || b.category?.kind === "both");
  const expenseBudgets = budgets.filter(b => b.category?.kind === "expense" || b.account_id); // Кредитные карты тоже в расходах

  const renderBudget = (budget: BudgetWithUsage) => {
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
                <div className={styles.cardTitle}>
                  {budget.account_id ? `💳 ${budget.account?.name ?? "Кредитная карта"}` : (budget.category?.name ?? "Без категории")}
                </div>
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
                  <label style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.label}>Комментарий</span>
                    <textarea
                      className={styles.input}
                      rows={2}
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Добавьте заметку к бюджету..."
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
                    <span className={styles.amountLabel}>
                      {budget.category?.kind === "income" || budget.category?.kind === "both" ? "План" : "Лимит"}
                    </span>
                    <span className={styles.amountValue}>{formatMoney(budget.limit_minor, budget.currency)}</span>
                  </div>
                  <div className={styles.amountItem}>
                    <span className={styles.amountLabel}>
                      {budget.category?.kind === "income" || budget.category?.kind === "both" ? "Получено" : "Потрачено"}
                    </span>
                    <span className={styles.amountValue}>{formatMoney(budget.spent_minor, budget.currency)}</span>
                  </div>
                  <div className={styles.amountItem}>
                    <span className={styles.amountLabel}>
                      {budget.category?.kind === "income" || budget.category?.kind === "both"
                        ? (budget.remaining_minor < 0 ? "Недобор" : "Сверх плана")
                        : (budget.remaining_minor >= 0 ? "Остаток" : "Перерасход")
                      }
                    </span>
                    <span className={styles.amountValue}>
                      {formatMoney(Math.abs(budget.remaining_minor), budget.currency)}
                    </span>
                  </div>
                </div>

                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${Math.min(Math.max(budget.progress, 0), 1) * 100}%` }}
                  />
                  <span className={styles.progressText}>
                    {Math.round(budget.progress * 100)}%
                  </span>
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
                  {budget.category?.kind === "income" || budget.category?.kind === "both"
                    ? (budget.progress >= 1
                        ? "План выполнен" 
                        : "План не выполнен")
                    : (budget.status === "over"
                        ? "Лимит превышен"
                        : budget.status === "warning"
                          ? "Осталось менее 15%"
                          : "В пределах лимита")
                  }
                </div>
                
                {budget.notes && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.5rem', 
                    background: '#f9fafb', 
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    fontStyle: 'italic'
                  }}>
                    💬 {budget.notes}
                  </div>
                )}
              </>
            )}
          </div>
        );
  };

  // Считаем итоговые суммы
  const totalIncomeLimit = incomeBudgets.reduce((sum, b) => sum + b.limit_minor, 0);
  const totalExpenseLimit = expenseBudgets.reduce((sum, b) => sum + b.limit_minor, 0);

  return (
    <>
      {incomeBudgets.length > 0 && (
        <>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 600, 
            marginBottom: '1rem', 
            color: 'var(--primary-dark)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>💰 Доходы</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#059669' }}>
              {formatMoney(totalIncomeLimit, 'RUB')}
            </span>
          </h3>
          {incomeBudgets.map(renderBudget)}
        </>
      )}
      
      {expenseBudgets.length > 0 && (
        <>
          <h3 style={{ 
            fontSize: '1.1rem', 
            fontWeight: 600, 
            marginTop: incomeBudgets.length > 0 ? '2rem' : 0, 
            marginBottom: '1rem', 
            color: 'var(--primary-dark)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>💸 Расходы</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#dc2626' }}>
              {formatMoney(totalExpenseLimit, 'RUB')}
            </span>
          </h3>
          {expenseBudgets.map(renderBudget)}
        </>
      )}
    </>
  );
}
