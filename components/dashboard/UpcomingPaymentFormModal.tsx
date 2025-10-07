"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import styles from "@/components/dashboard/Dashboard.module.css";
import {
  upcomingPaymentFormSchema,
  type UpcomingPaymentFormInput,
} from "@/lib/dashboard/upcoming-payments/schema";

type Account = {
  id: string;
  name: string;
  type: string;
  credit_limit?: number | null;
};

const getAccountTypeLabel = (account: Account): string => {
  if (account.type === "card") {
    // Различаем дебетовые и кредитные карты
    if (account.credit_limit && account.credit_limit > 0) {
      return "💳 Кредитная карта";
    }
    return "💳 Дебетовая карта";
  }
  
  const accountTypeLabels: Record<string, string> = {
    cash: "💵 Наличные",
    bank: "🏦 Банковский счёт",
    savings: "🏦 Накопительный счёт",
    investment: "📈 Инвестиционный счёт",
    loan: "💰 Кредит",
    other: "📊 Другой счёт",
  };
  return accountTypeLabels[account.type] || "📊 Счёт";
};

export type UpcomingPaymentFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: UpcomingPaymentFormInput) => void;
  pending?: boolean;
  title?: string;
  subtitle?: string;
  defaultValues?: Partial<UpcomingPaymentFormInput>;
  error?: string | null;
  isPaid?: boolean;
  hasLinkedTransaction?: boolean;
  onUnlinkTransaction?: () => Promise<void> | void;
  unlinkPending?: boolean;
};

const DEFAULT_VALUES: Partial<UpcomingPaymentFormInput> = {
  id: undefined,
  name: "",
  dueDate: new Date().toISOString().slice(0, 10),
  direction: "expense",
  accountName: undefined,
};

export default function UpcomingPaymentFormModal({
  open,
  onClose,
  onSubmit,
  pending = false,
  title = "Новый платёж",
  subtitle = "Создайте напоминание о предстоящем платеже",
  defaultValues,
  error,
  isPaid = false,
  hasLinkedTransaction = false,
  onUnlinkTransaction,
  unlinkPending = false,
}: UpcomingPaymentFormModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);

  const form = useForm<UpcomingPaymentFormInput>({
    resolver: zodResolver(upcomingPaymentFormSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      ...defaultValues,
    },
  });

  // Загружаем список счетов
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await fetch("/api/accounts");
        if (response.ok) {
          const data = await response.json();
          setAccounts(data.accounts || []);
        }
      } catch (error) {
        console.error("Failed to load accounts:", error);
      }
    };

    if (open) {
      loadAccounts();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_VALUES,
        ...defaultValues,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultValues?.id, defaultValues?.dueDate]);

  const handleSubmitClick = () => {
    form.handleSubmit((values) => {
      const normalized: UpcomingPaymentFormInput = {
        ...values,
        id: values.id && values.id.length > 0 ? values.id : undefined,
      };
      onSubmit(normalized);
    })();
  };

  const handleFormSubmit = form.handleSubmit((values) => {
    const normalized: UpcomingPaymentFormInput = {
      ...values,
      id: values.id && values.id.length > 0 ? values.id : undefined,
    };
    onSubmit(normalized);
  });

  const handleClose = () => {
    if (pending || unlinkPending) return;
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div className={styles.modalRoot} role="presentation" onClick={handleClose}>
      <div className={styles.modal} role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div>
            <div className={styles.modalTitle}>{title}</div>
            <div className={styles.modalSubtitle}>{subtitle}</div>
          </div>
          <button type="button" className={styles.modalClose} onClick={handleClose} aria-label="Закрыть">
            <span className="material-icons" aria-hidden>
              close
            </span>
          </button>
        </header>
        <div className={styles.modalContent}>
          {error && <div className={styles.modalError}>{error}</div>}
          <form id="upcomingPaymentForm" className={styles.modalForm} onSubmit={handleFormSubmit} noValidate>
            <input type="hidden" {...form.register("id")} />
            <div className={styles.modalFormGrid}>
              <label className={styles.formGroup}>
                <span className={styles.formLabel}>Название</span>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Например, аренда"
                  {...form.register("name")}
                  autoFocus
                  disabled={pending}
                />
                {form.formState.errors.name && (
                  <span className={styles.fieldError}>{form.formState.errors.name.message}</span>
                )}
              </label>
              <label className={styles.formGroup}>
                <span className={styles.formLabel}>Дата</span>
                <input
                  type="date"
                  className={styles.formInput}
                  {...form.register("dueDate")}
                  disabled={pending}
                />
                {form.formState.errors.dueDate && (
                  <span className={styles.fieldError}>{form.formState.errors.dueDate.message}</span>
                )}
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Формат: ГГГГ-ММ-ДД</span>
              </label>
              <label className={styles.formGroup}>
                <span className={styles.formLabel}>Сумма</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={styles.formInput}
                  placeholder="Введите сумму"
                  {...form.register("amountMajor")}
                  disabled={pending}
                  required
                />
                {form.formState.errors.amountMajor && (
                  <span className={styles.fieldError}>{form.formState.errors.amountMajor.message}</span>
                )}
              </label>
              <label className={styles.formGroup}>
                <span className={styles.formLabel}>Тип</span>
                <select className={styles.formSelect} {...form.register("direction")} disabled={pending}>
                  <option value="expense">Расход</option>
                  <option value="income">Доход</option>
                </select>
                {form.formState.errors.direction && (
                  <span className={styles.fieldError}>{form.formState.errors.direction.message}</span>
                )}
              </label>
              {isPaid && hasLinkedTransaction && (
                <label className={styles.formGroupFull}>
                  <span className={styles.formLabel}>Счёт</span>
                  <select
                    className={styles.formSelect}
                    {...form.register("accountName")}
                    disabled={true}
                  >
                    <option value="">Не выбран</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.name}>
                        {getAccountTypeLabel(account)} — {account.name}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.accountName && (
                    <span className={styles.fieldError}>{form.formState.errors.accountName.message}</span>
                  )}
                  <span style={{ fontSize: 12, color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="material-icons" style={{ fontSize: 16 }}>info</span>
                    Счёт указан из связанной транзакции
                  </span>
                </label>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={handleClose} disabled={pending}>
                Отмена
              </button>
              {isPaid && (
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => onUnlinkTransaction?.()}
                  disabled={pending || unlinkPending || !onUnlinkTransaction || !hasLinkedTransaction}
                >
                  {unlinkPending ? "Отменяем связь…" : "Убрать связь с транзакцией"}
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmitClick}
                className={styles.btnPrimary}
                disabled={pending || unlinkPending}
              >
                {pending ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
