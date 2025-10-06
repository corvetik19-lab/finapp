"use client";

import { useEffect, useState } from "react";
import styles from "./CreditCardTransactionsModal.module.css";
import { formatMoney } from "@/lib/utils/format";
import type { CreditCard } from "./CreditCardsList";

type Transaction = {
  id: string;
  direction: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  occurred_at: string;
  note: string | null;
  counterparty: string | null;
  category_name?: string | null;
  transfer_from_account_id?: string | null;
  transfer_to_account_id?: string | null;
  transfer_from_account_name?: string | null;
  transfer_to_account_name?: string | null;
};

type CreditCardTransactionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCard;
};

export default function CreditCardTransactionsModal({
  isOpen,
  onClose,
  card,
}: CreditCardTransactionsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && card) {
      loadTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, card]);

  const loadTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/credit-cards/${card.id}/transactions`);
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
              credit_card
            </span>
            Транзакции: {card.bank}
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
              <p>Нет транзакций по этой карте</p>
            </div>
          )}

          {!isLoading && !error && transactions.length > 0 && (
            <div className={styles.transactionsList}>
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className={`${styles.transactionItem} ${
                    txn.direction === "income" ? styles.income : txn.direction === "transfer" ? styles.transfer : styles.expense
                  }`}
                >
                  <div className={styles.transactionIcon}>
                    <span className="material-icons" aria-hidden>
                      {txn.direction === "income" ? "arrow_downward" : txn.direction === "transfer" ? "swap_horiz" : "arrow_upward"}
                    </span>
                  </div>

                  <div className={styles.transactionInfo}>
                    <div className={styles.transactionMain}>
                      <span className={styles.transactionCounterparty}>
                        {txn.direction === "transfer"
                          ? txn.transfer_from_account_id === card.id
                            ? `Перевод → ${txn.transfer_to_account_name || "?"}`
                            : `Перевод ← ${txn.transfer_from_account_name || "?"}`
                          : txn.counterparty || txn.note || "Без описания"}
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
                          : txn.direction === "transfer"
                            ? styles.amountTransfer
                            : styles.amountExpense
                      }
                    >
                      {txn.direction === "income" 
                        ? "−" 
                        : txn.direction === "transfer"
                          ? txn.transfer_from_account_id === card.id
                            ? "→"
                            : "←"
                          : "+"}
                      {formatMoney(txn.amount, txn.currency)}
                    </span>
                  </div>
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
