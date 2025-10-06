"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loanFormSchema, type LoanFormData } from "@/lib/loans/schema";
import type { Loan } from "@/lib/loans/types";
import styles from "./LoanModal.module.css";

type LoanFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loan?: Loan | null;
};

export default function LoanFormModal({ open, onClose, onSuccess, loan }: LoanFormModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isEdit = Boolean(loan);
  
  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      name: "",
      bank: "",
      principalAmount: 0,
      interestRate: 0,
      monthlyPayment: 0,
      issueDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      termMonths: undefined,
      paymentType: "annuity",
      contractNumber: "",
      nextPaymentDate: "",
    },
  });

  useEffect(() => {
    if (loan && open) {
      form.reset({
        id: loan.id,
        name: loan.name,
        bank: loan.bank,
        principalAmount: loan.principalAmount,
        interestRate: loan.interestRate,
        monthlyPayment: loan.monthlyPayment,
        issueDate: loan.issueDate,
        endDate: loan.endDate || "",
        termMonths: loan.termMonths || undefined,
        paymentType: loan.paymentType || "annuity",
        contractNumber: loan.contractNumber || "",
        nextPaymentDate: loan.nextPaymentDate || "",
      });
    } else if (!open) {
      form.reset();
      setError(null);
    }
  }, [loan, open, form]);

  const handleSubmit = async (data: LoanFormData) => {
    setIsSaving(true);
    setError(null);

    try {
      const url = "/api/loans";
      const method = isEdit ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Не удалось сохранить кредит");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? "Редактировать кредит" : "Добавить кредит"}</h3>
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

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <span className="material-icons">assignment</span>
                Название кредита
              </label>
              <input
                type="text"
                placeholder="Напр., Ипотека"
                {...form.register("name")}
                disabled={isSaving}
              />
              {form.formState.errors.name && (
                <span className={styles.fieldError}>{form.formState.errors.name.message}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>
                <span className="material-icons">account_balance</span>
                Банк
              </label>
              <input
                type="text"
                placeholder="Напр., Сбербанк"
                {...form.register("bank")}
                disabled={isSaving}
              />
              {form.formState.errors.bank && (
                <span className={styles.fieldError}>{form.formState.errors.bank.message}</span>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <span className="material-icons">paid</span>
                Сумма кредита (₽)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Напр., 1500000"
                {...form.register("principalAmount", { valueAsNumber: true })}
                disabled={isSaving}
              />
              {form.formState.errors.principalAmount && (
                <span className={styles.fieldError}>{form.formState.errors.principalAmount.message}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>
                <span className="material-icons">percent</span>
                Процентная ставка (%)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Напр., 8.5"
                {...form.register("interestRate", { valueAsNumber: true })}
                disabled={isSaving}
              />
              {form.formState.errors.interestRate && (
                <span className={styles.fieldError}>{form.formState.errors.interestRate.message}</span>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <span className="material-icons">payments</span>
                Ежемесячный платёж (₽)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Напр., 28500"
                {...form.register("monthlyPayment", { valueAsNumber: true })}
                disabled={isSaving}
              />
              {form.formState.errors.monthlyPayment && (
                <span className={styles.fieldError}>{form.formState.errors.monthlyPayment.message}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>
                <span className="material-icons">event</span>
                Дата выдачи
              </label>
              <input
                type="date"
                {...form.register("issueDate")}
                disabled={isSaving}
              />
              {form.formState.errors.issueDate && (
                <span className={styles.fieldError}>{form.formState.errors.issueDate.message}</span>
              )}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <span className="material-icons">schedule</span>
                Срок кредита (месяцы)
              </label>
              <input
                type="number"
                placeholder="Напр., 240"
                {...form.register("termMonths", { valueAsNumber: true })}
                disabled={isSaving}
              />
              {form.formState.errors.termMonths && (
                <span className={styles.fieldError}>{form.formState.errors.termMonths.message}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>
                <span className="material-icons">event</span>
                Дата окончания
              </label>
              <input
                type="date"
                {...form.register("endDate")}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <span className="material-icons">event_available</span>
                Дата следующего платежа
              </label>
              <input
                type="date"
                {...form.register("nextPaymentDate")}
                disabled={isSaving}
                placeholder="Для автоматических напоминаний"
              />
              {form.formState.errors.nextPaymentDate && (
                <span className={styles.fieldError}>{form.formState.errors.nextPaymentDate.message}</span>
              )}
            </div>
            <div className={styles.formGroup}>
              <div className={styles.infoMessage}>
                <span className="material-icons">info</span>
                <span>Создаст напоминание за 10 дней до срока</span>
              </div>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <span className="material-icons">description</span>
                Тип платежа
              </label>
              <select {...form.register("paymentType")} disabled={isSaving}>
                <option value="annuity">Аннуитетный</option>
                <option value="differentiated">Дифференцированный</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>
                <span className="material-icons">badge</span>
                Номер договора
              </label>
              <input
                type="text"
                placeholder="Напр., ИП-2023-045678"
                {...form.register("contractNumber")}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isSaving}>
              Отмена
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
              {isSaving ? "Сохранение..." : isEdit ? "Сохранить" : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
