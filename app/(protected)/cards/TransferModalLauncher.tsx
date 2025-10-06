"use client";

import { useState, useMemo, useId, useCallback, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { transferStashAction } from "./actions";
import styles from "./cards.module.css";

type Mode = "to_stash" | "from_stash";

type StashOption = {
  accountId: string;
  accountName: string;
  cardBalance: number;
  cardCurrency: string;
  stashId: string;
  stashBalance: number;
  stashCurrency: string;
};

type TransferModalLauncherProps = {
  mode: Mode;
  icon: string;
  label: string;
  options: StashOption[];
};

type CurrencyFormatterConfig = {
  value: number;
  currency: string;
};

function formatMoney({ value, currency }: CurrencyFormatterConfig) {
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
    maximumFractionDigits: 2,
  }).format(major);
}

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();
  const text = mode === "to_stash" ? "Перевести в Кубышку" : "Перевести из Кубышки";
  return (
    <button className={styles.primaryBtn} type="submit" disabled={pending}>
      {pending ? "Выполняем..." : text}
    </button>
  );
}

export default function TransferModalLauncher({ mode, icon, label, options }: TransferModalLauncherProps) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState(0);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const titleId = useId();

  const hasOptions = options.length > 0;
  const current = options[selection] ?? options[0] ?? null;

  const dialogTitle = mode === "to_stash" ? "Перевод в Кубышку" : "Перевод из Кубышки";
  const balanceHint = useMemo(() => {
    if (!current) return null;
    const { cardBalance, cardCurrency, stashBalance, stashCurrency } = current;
    return {
      card: formatMoney({ value: cardBalance, currency: cardCurrency }),
      stash: formatMoney({ value: stashBalance, currency: stashCurrency }),
    };
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

  const onOpen = useCallback(() => {
    if (!hasOptions) return;
    setSelection(0);
    resetFormState();
    setOpen(true);
  }, [hasOptions, resetFormState]);

  const onClose = useCallback(() => {
    setOpen(false);
    resetFormState();
  }, [resetFormState]);

  return (
    <div className={styles.actionWrapper}>
      <button
        type="button"
        className={styles.actionCard}
        onClick={onOpen}
        disabled={!hasOptions}
      >
        <div className={styles.actionIcon}>
          <i className="material-icons">{icon}</i>
        </div>
        <div className={styles.actionTitle}>{label}</div>
        {!hasOptions && <div className={styles.actionHint}>Нет доступной Кубышки</div>}
      </button>

      {success && <div className={`${styles.toast} ${styles.toastSuccess}`}>{success}</div>}

      {open && current && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle} id={titleId}>
                {dialogTitle}
              </div>
              <button className={styles.modalClose} type="button" onClick={onClose} aria-label="Закрыть">
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

                if (current) {
                  const minor = Math.round(parsed * 100);
                  if (mode === "to_stash" && minor > current.cardBalance) {
                    setError("Недостаточно средств на карте");
                    return;
                  }
                  if (mode === "from_stash" && minor > current.stashBalance) {
                    setError("Недостаточно средств в Кубышке");
                    return;
                  }
                }

                setError(null);
                formData.set("amount_major", normalized);

                await transferStashAction(formData);
                setSuccess(mode === "to_stash" ? "Перевод в Кубышку выполнен" : "Перевод из Кубышки выполнен");
                onClose();
              }}
            >
              <div className={styles.modalBody}>
                {options.length > 1 && (
                  <div className={styles.formField}>
                    <label htmlFor={`${titleId}-account`}>Карта</label>
                    <select
                      id={`${titleId}-account`}
                      name="__account_select"
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

                <input type="hidden" name="direction" value={mode} />
                <input type="hidden" name="account_id" value={current.accountId} />
                <input type="hidden" name="stash_id" value={current.stashId} />
                <input type="hidden" name="currency" value={current.stashCurrency} />

                <div className={styles.formField}>
                  <label htmlFor={`${titleId}-amount`}>Сумма (₽)</label>
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

                {balanceHint && (
                  <div className={styles.balanceSummary}>
                    <div>
                      <div className={styles.balanceLabel}>Баланс карты</div>
                      <div className={styles.balanceValue}>{balanceHint.card}</div>
                    </div>
                    <div>
                      <div className={styles.balanceLabel}>Баланс Кубышки</div>
                      <div className={styles.balanceValue}>{balanceHint.stash}</div>
                    </div>
                  </div>
                )}

                <div className={styles.modalHint}>
                  {mode === "to_stash"
                    ? "Средства спишутся с карты и будут зачислены в Кубышку"
                    : "Средства поступят на карту и уменьшат баланс Кубышки"}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <div className={styles.modalActions}>
                  <button className={styles.secondaryBtn} type="button" onClick={onClose}>
                    Отмена
                  </button>
                  <SubmitButton mode={mode} />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
