"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Debt, DebtSummary } from "@/lib/debts/types";
import { formatMoney } from "@/lib/utils/format";
import styles from "@/app/(protected)/debts/Debts.module.css";
import DebtFormModal from "./DebtFormModal";
import { deleteDebt, markDebtAsPaid } from "@/app/(protected)/debts/actions";

type DebtsPageClientProps = {
  debts: Debt[];
  summary: DebtSummary;
};

export default function DebtsPageClient({ debts, summary }: DebtsPageClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [filter, setFilter] = useState<"all" | "owe" | "owed">("all");

  const filteredDebts = debts.filter((debt) => {
    if (filter === "all") return true;
    return debt.type === filter;
  });

  const handleCreate = () => {
    setEditingDebt(null);
    setIsModalOpen(true);
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Удалить этот долг?")) return;

    try {
      const formData = new FormData();
      formData.append("id", id);
      await deleteDebt(formData);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Не удалось удалить долг");
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!window.confirm("Отметить долг как полностью оплаченный?")) return;

    try {
      const formData = new FormData();
      formData.append("id", id);
      await markDebtAsPaid(formData);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Не удалось отметить долг как оплаченный");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDebt(null);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    setEditingDebt(null);
    router.refresh();
  };

  // Проверяем просрочку
  const isOverdue = (dateDue: string | null) => {
    if (!dateDue) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateDue);
    return dueDate < today;
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.pageTitle}>Долги</div>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={handleCreate}>
            <span className="material-icons" aria-hidden>
              add
            </span>
            Добавить долг
          </button>
        </div>
      </div>

      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Всего долгов</div>
          <div className={styles.summaryValue}>{summary.activeDebtsCount}</div>
          <div className={styles.summaryMeta}>Активные записи</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Вы должны</div>
          <div className={`${styles.summaryValue} ${styles.valueNegative}`}>
            {formatMoney(Math.round(summary.totalOwed * 100), "RUB")}
          </div>
          <div className={styles.summaryMeta}>Ваши обязательства</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Вам должны</div>
          <div className={`${styles.summaryValue} ${styles.valuePositive}`}>
            {formatMoney(Math.round(summary.totalOwedToYou * 100), "RUB")}
          </div>
          <div className={styles.summaryMeta}>Ваши требования</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Просрочено</div>
          <div className={styles.summaryValue}>{summary.overdueCount}</div>
          <div className={styles.summaryMeta}>Требуют внимания</div>
        </div>
      </section>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${filter === "all" ? styles.tabActive : ""}`}
          onClick={() => setFilter("all")}
        >
          Все
        </button>
        <button
          type="button"
          className={`${styles.tab} ${filter === "owe" ? styles.tabActive : ""}`}
          onClick={() => setFilter("owe")}
        >
          Вы должны
        </button>
        <button
          type="button"
          className={`${styles.tab} ${filter === "owed" ? styles.tabActive : ""}`}
          onClick={() => setFilter("owed")}
        >
          Вам должны
        </button>
      </div>

      <section className={styles.list}>
        {filteredDebts.length === 0 ? (
          <div className={styles.empty}>
            {filter === "all"
              ? "Долгов пока нет. Добавьте первую запись."
              : filter === "owe"
                ? "Вы никому не должны."
                : "Вам никто не должен."}
          </div>
        ) : (
          filteredDebts.map((debt) => {
            const overdue = isOverdue(debt.dateDue);
            
            return (
              <div key={debt.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardName}>{debt.creditorDebtorName}</div>
                    <div className={styles.cardMeta}>
                      <span className={debt.type === "owe" ? styles.badgeOwe : styles.badgeOwed}>
                        {debt.type === "owe" ? "Вы должны" : "Вам должны"}
                      </span>
                      <span className={debt.status === "paid" ? styles.badgePaid : styles.badgeActive}>
                        {debt.status === "paid"
                          ? "Оплачено"
                          : debt.status === "partially_paid"
                            ? "Частично оплачено"
                            : "Активно"}
                      </span>
                      {overdue && debt.status !== "paid" && (
                        <span className={styles.badgeOverdue}>Просрочен</span>
                      )}
                      <span>{new Date(debt.dateCreated).toLocaleDateString("ru-RU")}</span>
                      {debt.dateDue && (
                        <span>
                          Срок: {new Date(debt.dateDue).toLocaleDateString("ru-RU")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.cardAmounts}>
                  <div className={styles.amountItem}>
                    <span className={styles.amountLabel}>Сумма</span>
                    <span className={styles.amountValue}>{formatMoney(Math.round(debt.amount * 100), debt.currency)}</span>
                  </div>
                  <div className={styles.amountItem}>
                    <span className={styles.amountLabel}>Оплачено</span>
                    <span className={styles.amountValue}>{formatMoney(Math.round(debt.amountPaid * 100), debt.currency)}</span>
                  </div>
                  <div className={styles.amountItem}>
                    <span className={styles.amountLabel}>Остаток</span>
                    <span className={styles.amountValue}>
                      {formatMoney(Math.round(debt.remainingAmount * 100), debt.currency)}
                    </span>
                  </div>
                </div>

                {debt.status !== "paid" && (
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${Math.min(debt.progressPercent, 100)}%` }}
                    />
                  </div>
                )}

                {debt.description && (
                  <div className={styles.description}>{debt.description}</div>
                )}

                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => handleEdit(debt)}
                  >
                    <span className="material-icons" aria-hidden>
                      edit
                    </span>
                    Редактировать
                  </button>
                  {debt.status !== "paid" && (
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={() => handleMarkPaid(debt.id)}
                    >
                      <span className="material-icons" aria-hidden>
                        check_circle
                      </span>
                      Отметить оплаченным
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(debt.id)}
                  >
                    <span className="material-icons" aria-hidden>
                      delete
                    </span>
                    Удалить
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      {isModalOpen && (
        <DebtFormModal
          debt={editingDebt}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
