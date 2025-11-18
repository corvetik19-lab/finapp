"use client";

import { useEffect, useRef } from "react";

import styles from "@/components/dashboard/Dashboard.module.css";
import { formatMoney } from "@/lib/utils/format";
import type { CategoryTransactionItem } from "@/lib/dashboard/category-management";

export type CategoryTransactionsModalProps = {
  open: boolean;
  onClose: () => void;
  categoryName: string | null;
  currency: string;
  transactions: CategoryTransactionItem[];
  loading: boolean;
  error: string | null;
};

export default function CategoryTransactionsModal({
  open,
  onClose,
  categoryName,
  currency,
  transactions,
  loading,
  error,
}: CategoryTransactionsModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className={styles.modalRoot} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal
        aria-labelledby="category-transactions-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <div id="category-transactions-title" className={styles.modalTitle}>
              Транзакции категории
            </div>
            {categoryName && <div className={styles.modalSubtitle}>{categoryName}</div>}
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Закрыть">
            <span className="material-icons" aria-hidden>
              close
            </span>
          </button>
        </header>

        <div className={styles.modalContent}>
          {loading && <div className={styles.modalStatus}>Загрузка транзакций…</div>}
          {error && <div className={styles.modalError}>{error}</div>}
          {!loading && !error && transactions.length === 0 && (
            <div className={styles.modalStatus}>Нет транзакций за выбранный период.</div>
          )}

          {!loading && !error && transactions.length > 0 && (
            <div className={styles.modalTransactionsScroll}>
              <ul className={styles.modalTransactionList}>
                {transactions.map((item) => (
                  <li key={item.id} className={styles.modalTransactionItem}>
                    <div className={styles.modalTransactionHeader}>
                      <span className={styles.modalTransactionDate}>
                        {new Date(item.occurredAt).toLocaleString("ru-RU")}
                      </span>
                      <span
                        className={`${styles.modalTransactionAmount} ${
                          item.direction === "income"
                            ? styles.modalTransactionIncome
                            : item.direction === "expense"
                            ? styles.modalTransactionExpense
                            : ""
                        }`}
                      >
                        {item.direction === "income" ? "+" : item.direction === "expense" ? "-" : ""}
                        {formatMoney(item.amountMinor, item.currency || currency)}
                      </span>
                    </div>
                    <div className={styles.modalTransactionMeta}>
                      <span>{item.counterparty || item.note || "Без описания"}</span>
                      {item.accountName && <span className={styles.modalTransactionAccount}>{item.accountName}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
