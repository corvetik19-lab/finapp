"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loanRepaymentSchema, type LoanRepaymentData } from "@/lib/loans/schema";
import type { Loan } from "@/lib/loans/types";
import { formatMoney } from "@/lib/utils/format";
import styles from "./LoanModal.module.css";

type LoanRepayModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loans: Loan[];
};

export default function LoanRepayModal({ open, onClose, onSuccess, loans }: LoanRepayModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");

  const form = useForm<LoanRepaymentData>({
    resolver: zodResolver(loanRepaymentSchema),
    defaultValues: {
      loanId: "",
      amount: 0,
      commission: 0,
      paymentDate: new Date().toISOString().slice(0, 10),
      note: "",
    },
  });

  const selectedLoan = loans.find(l => l.id === selectedLoanId);

  // Автоматическое заполнение суммы при выборе кредита
  const handleLoanChange = (loanId: string) => {
    setSelectedLoanId(loanId);
    form.setValue("loanId", loanId);
    
    const loan = loans.find(l => l.id === loanId);
    if (loan) {
      // Автоматически подставляем ежемесячный платёж
      form.setValue("amount", loan.monthlyPayment);
    }
  };

  const handleSubmit = async (data: LoanRepaymentData) => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/loans/repay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Не удалось погасить кредит");
      }

      onSuccess();
      onClose();
      form.reset();
      setSelectedLoanId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  const activeLoans = loans.filter(l => l.status === "active");

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Погасить кредит</h3>
          <button className={styles.closeBtn} onClick={onClose} disabled={isSaving}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className={styles.modalBody}>
          {error && (
            <div className={styles.errorMessage}>
              <span className="material-icons">error</span>
              {error}
            </div>
          )}

          {activeLoans.length === 0 && (
            <div className={styles.infoMessage}>
              <span className="material-icons">info</span>
              Нет активных кредитов для погашения
            </div>
          )}

          {activeLoans.length > 0 && (
            <>
              <div className={styles.formGroup}>
                <label>
                  <span className="material-icons">account_balance</span>
                  Кредит
                </label>
                <select
                  {...form.register("loanId")}
                  onChange={(e) => handleLoanChange(e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Выберите кредит</option>
                  {activeLoans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.name} — {loan.bank}
                    </option>
                  ))}
                </select>
                {form.formState.errors.loanId && (
                  <span className={styles.fieldError}>{form.formState.errors.loanId.message}</span>
                )}
              </div>

              {selectedLoan && (
                <div className={styles.loanInfo}>
                  <div className={styles.loanInfoRow}>
                    <span>Остаток долга:</span>
                    <strong>{formatMoney(selectedLoan.remainingDebt * 100, selectedLoan.currency)}</strong>
                  </div>
                  <div className={styles.loanInfoRow}>
                    <span>Ежемесячный платёж:</span>
                    <strong>{formatMoney(selectedLoan.monthlyPayment * 100, selectedLoan.currency)}</strong>
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>
                  <span className="material-icons">paid</span>
                  Сумма платежа (₽)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Напр., 28500"
                  {...form.register("amount", { valueAsNumber: true })}
                  disabled={isSaving}
                />
                {form.formState.errors.amount && (
                  <span className={styles.fieldError}>{form.formState.errors.amount.message}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>
                  <span className="material-icons">receipt</span>
                  Комиссия банка (₽)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Напр., 100 (необязательно)"
                  {...form.register("commission", { valueAsNumber: true })}
                  disabled={isSaving}
                />
                {form.formState.errors.commission && (
                  <span className={styles.fieldError}>{form.formState.errors.commission.message}</span>
                )}
                <small className={styles.fieldHint}>
                  Укажите комиссию, если банк взимает плату за досрочное погашение
                </small>
              </div>

              <div className={styles.formGroup}>
                <label>
                  <span className="material-icons">event</span>
                  Дата платежа
                </label>
                <input
                  type="date"
                  {...form.register("paymentDate")}
                  disabled={isSaving}
                />
                {form.formState.errors.paymentDate && (
                  <span className={styles.fieldError}>{form.formState.errors.paymentDate.message}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>
                  <span className="material-icons">notes</span>
                  Примечание
                </label>
                <textarea
                  rows={3}
                  placeholder="Дополнительная информация..."
                  {...form.register("note")}
                  disabled={isSaving}
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isSaving}>
                  Отмена
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
                  {isSaving ? "Сохранение..." : "Погасить"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
