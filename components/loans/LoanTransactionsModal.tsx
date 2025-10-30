"use client";

import { useEffect, useState } from "react";
import styles from "./LoanTransactionsModal.module.css";
import { formatMoney } from "@/lib/utils/format";
import type { Loan } from "@/lib/loans/types";

type Transaction = {
  id: string;
  direction: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  occurred_at: string;
  note: string | null;
  counterparty: string | null;
  category_name?: string | null;
};

type LoanTransactionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
};

export default function LoanTransactionsModal({
  isOpen,
  onClose,
  loan,
}: LoanTransactionsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && loan) {
      loadTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loan]);

  const loadTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/loans/${loan.id}/transactions`);
      if (!response.ok) {
        throw new Error("Не удалось загрузить транзакции");
      }
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки транзакций");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Удалить эту транзакцию? Это отменит погашение кредита.")) {
      return;
    }

    setDeletingId(transactionId);
    try {
      const formData = new FormData();
      formData.append("id", transactionId);

      const response = await fetch("/api/transactions/delete", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Не удалось удалить транзакцию");
      }

      // Обновляем список транзакций
      await loadTransactions();
      
      // Перезагружаем страницу чтобы обновить баланс кредита
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка удаления транзакции");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <span className="material-icons" aria-hidden>
              account_balance
            </span>
            Транзакции: {loan.name} ({loan.bank})
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Закрыть"
          >
            <span className="material-icons" aria-hidden>
              close
            </span>
          </button>
        </header>

        <div className={styles.modalBody}>
          {isLoading && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Загрузка транзакций...</p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <span className="material-icons" aria-hidden>
                error_outline
              </span>
              {error}
            </div>
          )}

          {!isLoading && !error && transactions.length === 0 && (
            <div className={styles.emptyState}>
              <span className="material-icons" aria-hidden>
                receipt_long
              </span>
              <p>Нет транзакций по этому кредиту</p>
            </div>
          )}

          {!isLoading && !error && transactions.length > 0 && (
            <div className={styles.transactionsList}>
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className={`${styles.transactionItem} ${
                    txn.direction === "income" ? styles.income : styles.expense
                  }`}
                >
                  <div className={styles.transactionIcon}>
                    <span className="material-icons" aria-hidden>
                      {txn.direction === "income" ? "arrow_downward" : "arrow_upward"}
                    </span>
                  </div>

                  <div className={styles.transactionInfo}>
                    <div className={styles.transactionMain}>
                      <span className={styles.transactionCounterparty}>
                        {txn.counterparty || txn.note || "Без описания"}
                      </span>
                      {txn.category_name && (
                        <span className={styles.transactionCategory}>{txn.category_name}</span>
                      )}
                    </div>
                    <div className={styles.transactionDate}>{formatDate(txn.occurred_at)}</div>
                  </div>

                  <div className={styles.transactionAmount}>
                    <span
                      className={
                        txn.direction === "income"
                          ? styles.amountIncome
                          : styles.amountExpense
                      }
                    >
                      {txn.direction === "income" ? "+" : "−"}
                      {formatMoney(txn.amount, txn.currency)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(txn.id)}
                    disabled={deletingId === txn.id}
                    title="Удалить транзакцию"
                  >
                    <span className="material-icons" aria-hidden>
                      {deletingId === txn.id ? "hourglass_empty" : "delete"}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
