"use client";

import { useState, FormEvent, useEffect } from "react";
import styles from "./CreateCreditCardModal.module.css";
import type { CreditCard } from "./CreditCardsList";

export type CreateCreditCardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCard?: CreditCard | null;
};

export default function CreateCreditCardModal({
  isOpen,
  onClose,
  onSuccess,
  editingCard,
}: CreateCreditCardModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    credit_limit: "",
    balance: "",
    interest_rate: "",
    grace_period: "",
    next_payment_date: "",
    min_payment: "",
  });

  const isEditMode = Boolean(editingCard);

  // Заполняем форму при редактировании
  useEffect(() => {
    if (editingCard && isOpen) {
      setFormData({
        name: editingCard.bank,
        credit_limit: (editingCard.limit / 100).toString(),
        balance: (editingCard.balance / 100).toString(),
        interest_rate: editingCard.interestRate ? editingCard.interestRate.toString() : "",
        grace_period: editingCard.gracePeriod ? editingCard.gracePeriod.toString() : "",
        next_payment_date: editingCard.nextPaymentDate || "",
        min_payment: (editingCard.minPayment / 100).toString(),
      });
    } else if (!editingCard && isOpen) {
      setFormData({
        name: "",
        credit_limit: "",
        balance: "",
        interest_rate: "",
        grace_period: "",
        next_payment_date: "",
        min_payment: "",
      });
    }
  }, [editingCard, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const creditLimitMinor = Math.round(parseFloat(formData.credit_limit) * 100);
      const balanceMinor = formData.balance ? Math.round(parseFloat(formData.balance) * 100) : 0;
      const interestRate = formData.interest_rate ? parseFloat(formData.interest_rate) : null;
      const gracePeriod = formData.grace_period ? parseInt(formData.grace_period) : null;
      const minPaymentMinor = formData.min_payment ? Math.round(parseFloat(formData.min_payment) * 100) : 0;

      const url = isEditMode ? `/api/credit-cards/${editingCard?.id}` : "/api/credit-cards";
      const method = isEditMode ? "PATCH" : "POST";

      const bodyData: Record<string, unknown> = {
        name: formData.name,
        credit_limit: creditLimitMinor,
        interest_rate: interestRate,
        grace_period: gracePeriod,
        next_payment_date: formData.next_payment_date || null,
        min_payment: minPaymentMinor,
      };

      // Баланс отправляем только при создании
      if (!isEditMode) {
        bodyData.balance = balanceMinor;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}`
          : data.error || `Ошибка при ${isEditMode ? "обновлении" : "создании"} карты`;
        throw new Error(errorMessage);
      }

      setFormData({
        name: "",
        credit_limit: "",
        balance: "",
        interest_rate: "",
        grace_period: "",
        next_payment_date: "",
        min_payment: "",
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
      setError(null);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            {isEditMode ? "Редактировать кредитную карту" : "Добавить кредитную карту"}
          </div>
          <button
            type="button"
            className={styles.modalClose}
            onClick={handleClose}
            disabled={isSaving}
            aria-label="Закрыть"
          >
            <span className="material-icons" aria-hidden>
              close
            </span>
          </button>
        </header>

        <form className={styles.modalContent} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="card-name">
                Название <span style={{ color: "#f44336" }}>*</span>
              </label>
              <input
                id="card-name"
                className={styles.formInput}
                placeholder="Например, Тинькофф Платинум"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                disabled={isSaving}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="card-limit">
                Кредитный лимит (₽) <span style={{ color: "#f44336" }}>*</span>
              </label>
              <input
                id="card-limit"
                className={styles.formInput}
                type="number"
                step="0.01"
                placeholder="Например, 250000"
                value={formData.credit_limit}
                onChange={(e) => setFormData((prev) => ({ ...prev, credit_limit: e.target.value }))}
                required
                disabled={isSaving}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="card-balance">
                Текущая задолженность (₽)
              </label>
              <input
                id="card-balance"
                className={styles.formInput}
                type="number"
                step="0.01"
                min="0"
                placeholder="Например, 15000"
                value={formData.balance}
                onChange={(e) => setFormData((prev) => ({ ...prev, balance: e.target.value }))}
                disabled={isEditMode || isSaving}
                title={isEditMode ? "Задолженность можно изменить только через транзакции" : ""}
              />
              {isEditMode && (
                <span style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                  Изменяется только через транзакции
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="card-rate">
                Процентная ставка (%)
              </label>
              <input
                id="card-rate"
                className={styles.formInput}
                type="number"
                step="0.1"
                placeholder="Например, 25.9"
                value={formData.interest_rate}
                onChange={(e) => setFormData((prev) => ({ ...prev, interest_rate: e.target.value }))}
                disabled={isSaving}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="card-grace">
                Льготный период (дней)
              </label>
              <input
                id="card-grace"
                className={styles.formInput}
                type="number"
                placeholder="Например, 55"
                value={formData.grace_period}
                onChange={(e) => setFormData((prev) => ({ ...prev, grace_period: e.target.value }))}
                disabled={isSaving}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="card-payment-date">
                Дата платежа
              </label>
              <input
                id="card-payment-date"
                className={styles.formInput}
                type="date"
                value={formData.next_payment_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, next_payment_date: e.target.value }))}
                disabled={isSaving}
              />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Дата, до которой нужно оплатить
              </span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="card-min-payment">
                Минимальный платеж (₽)
              </label>
              <input
                id="card-min-payment"
                className={styles.formInput}
                type="number"
                step="0.01"
                min="0"
                placeholder="Например, 1000"
                value={formData.min_payment}
                onChange={(e) => setFormData((prev) => ({ ...prev, min_payment: e.target.value }))}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleClose}
              disabled={isSaving}
            >
              Отмена
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
              {isSaving 
                ? (isEditMode ? "Сохранение..." : "Создание...") 
                : (isEditMode ? "Сохранить" : "Создать")
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
