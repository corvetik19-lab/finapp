"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./cards.module.css";
import { addFundsAction } from "./actions";

type FundsOption = {
  accountId: string;
  accountName: string;
  cardBalance: number;
  cardCurrency: string;
};

type AddFundsModalProps = {
  icon: string;
  label: string;
  options: FundsOption[];
};

function formatCurrency(value: number, currency: string) {
  const major = value / 100;
  
  // Для рублей не показываем код валюты
  if (currency === "RUB") {
    return `${major.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₽`;
  }
  
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.primaryBtn} type="submit" disabled={pending}>
      {pending ? "Сохраняем..." : "Пополнить карту"}
    </button>
  );
}

export default function AddFundsModal({ icon, label, options }: AddFundsModalProps) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState(0);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const titleId = useId();

  const hasOptions = options.length > 0;
  const current = options[selection] ?? options[0] ?? null;

  const balances = useMemo(() => {
    if (!current) return null;
    return formatCurrency(current.cardBalance, current.cardCurrency);
  }, [current]);

  const resetFormState = useCallback(() => {
    setAmount("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 3500);
    return () => window.clearTimeout(timer);
  }, [success]);

  const handleOpen = useCallback(() => {
    if (!hasOptions) return;
    setSelection(0);
    resetFormState();
    setOpen(true);
  }, [hasOptions, resetFormState]);

  const handleClose = useCallback(() => {
    setOpen(false);
    resetFormState();
  }, [resetFormState]);

  return (
    <div className={styles.actionWrapper}>
      <button
        type="button"
        className={styles.actionCard}
        onClick={handleOpen}
        disabled={!hasOptions}
      >
        <div className={styles.actionIcon}>
          <i className="material-icons">{icon}</i>
        </div>
        <div className={styles.actionTitle}>{label}</div>
        {!hasOptions && <div className={styles.actionHint}>Нет карт для пополнения</div>}
      </button>

      {success && <div className={`${styles.toast} ${styles.toastSuccess}`}>{success}</div>}

      {open && current && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle} id={titleId}>
                Пополнение карты
              </div>
              <button className={styles.modalClose} type="button" onClick={handleClose} aria-label="Закрыть">
                ×
              </button>
            </div>

            <form
              action={async (formData) => {
                const rawAmount = formData.get("amount_major");
                const normalized = typeof rawAmount === "string" ? rawAmount.trim().replace(/\s+/g, "").replace(",", ".") : "";
                const parsed = Number(normalized);

                if (!normalized || Number.isNaN(parsed) || parsed <= 0) {
                  setError("Введите сумму больше 0");
                  return;
                }

                setError(null);
                formData.set("amount_major", normalized);

                await addFundsAction(formData);
                setSuccess("Карта успешно пополнена");
                handleClose();
              }}
            >
              <div className={styles.modalBody}>
                {options.length > 1 && (
                  <div className={styles.formField}>
                    <label htmlFor={`${titleId}-card`}>Карта</label>
                    <select
                      id={`${titleId}-card`}
                      name="__card_select"
                      value={current.accountId}
                      onChange={(event) => {
                        const nextIndex = options.findIndex((opt) => opt.accountId === event.target.value);
                        setSelection(nextIndex >= 0 ? nextIndex : 0);
                      }}
                    >
                      {options.map((opt) => (
                        <option key={opt.accountId} value={opt.accountId}>
                          {opt.accountName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <input type="hidden" name="account_id" value={current.accountId} />
                <input type="hidden" name="currency" value={current.cardCurrency} />

                <div className={styles.formField}>
                  <label htmlFor={`${titleId}-amount`}>Сумма пополнения (₽)</label>
                  <input
                    id={`${titleId}-amount`}
                    name="amount_major"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      if (error) setError(null);
                    }}
                  />
                  {error && <div className={styles.fieldError}>{error}</div>}
                </div>

                <div className={styles.formField}>
                  <label htmlFor={`${titleId}-note`}>Комментарий (опционально)</label>
                  <input
                    id={`${titleId}-note`}
                    name="note"
                    type="text"
                    placeholder="Например, перевод зарплаты"
                    maxLength={200}
                  />
                </div>

                {balances && (
                  <div className={styles.balanceSummary}>
                    <div>
                      <div className={styles.balanceLabel}>Текущий баланс карты</div>
                      <div className={styles.balanceValue}>{balances}</div>
                    </div>
                  </div>
                )}

                <div className={styles.modalHint}>
                  Пополнение будет сохранено как доход и отобразится в истории транзакций выбранной карты.
                </div>
              </div>

              <div className={styles.modalFooter}>
                <div className={styles.modalActions}>
                  <button className={styles.secondaryBtn} type="button" onClick={handleClose}>
                    Отмена
                  </button>
                  <SubmitButton />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
