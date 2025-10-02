"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import styles from "@/components/dashboard/Dashboard.module.css";
import {
  upcomingPaymentFormSchema,
  type UpcomingPaymentFormInput,
} from "@/lib/dashboard/upcoming-payments/schema";

export type UpcomingPaymentFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: UpcomingPaymentFormInput) => void;
  pending?: boolean;
  title?: string;
  subtitle?: string;
  defaultValues?: Partial<UpcomingPaymentFormInput>;
  error?: string | null;
};

const DEFAULT_VALUES: UpcomingPaymentFormInput = {
  id: undefined,
  name: "",
  dueDate: new Date().toISOString().slice(0, 10),
  amountMajor: 0,
  direction: "expense",
  accountName: undefined,
  description: undefined,
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
}: UpcomingPaymentFormModalProps) {
  const form = useForm<UpcomingPaymentFormInput>({
    resolver: zodResolver(upcomingPaymentFormSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_VALUES,
        ...defaultValues,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultValues?.id, defaultValues?.dueDate]);

  if (!open) {
    return null;
  }

  const submitForm = form.handleSubmit((values) => {
    const normalized: UpcomingPaymentFormInput = {
      ...values,
      id: values.id && values.id.length > 0 ? values.id : undefined,
    };
    onSubmit(normalized);
  });

  const handleSubmitClick = () => {
    submitForm();
  };

  const handleClose = () => {
    if (pending) return;
    onClose();
  };

  return (
    <div className={styles.modalRoot} role="dialog" aria-modal>
      <div className={styles.modalOverlay}>
        <header className={styles.modalHeader}>
          <div>
            <div className={styles.modalTitle}>{title}</div>
            <div className={styles.modalSubtitle}>{subtitle}</div>
          </div>
          <button type="button" className={styles.modalCloseButton} onClick={handleClose} aria-label="Закрыть">
            <span className="material-icons" aria-hidden>
              close
            </span>
          </button>
        </header>
        <div className={styles.modalBody}>
          {error && <div className={styles.modalError}>{error}</div>}
          <form id="upcomingPaymentForm" className={styles.upcomingForm} onSubmit={submitForm} noValidate>
            <input type="hidden" {...form.register("id")} />
            <div className={styles.upcomingFormGrid}>
              <label className={styles.upcomingFormField}>
                <span className={styles.upcomingFormLabel}>Название</span>
                <input
                  type="text"
                  className={styles.upcomingFormInput}
                  placeholder="Например, аренда"
                  {...form.register("name")}
                  autoFocus
                  disabled={pending}
                />
                {form.formState.errors.name && (
                  <span className={styles.upcomingFormError}>{form.formState.errors.name.message}</span>
                )}
              </label>
              <label className={styles.upcomingFormField}>
                <span className={styles.upcomingFormLabel}>Дата</span>
                <input
                  type="date"
                  className={styles.upcomingFormInput}
                  {...form.register("dueDate")}
                  disabled={pending}
                />
                {form.formState.errors.dueDate && (
                  <span className={styles.upcomingFormError}>{form.formState.errors.dueDate.message}</span>
                )}
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Формат: ГГГГ-ММ-ДД</span>
              </label>
              <label className={styles.upcomingFormField}>
                <span className={styles.upcomingFormLabel}>Сумма</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={styles.upcomingFormInput}
                  placeholder="0.00"
                  {...form.register("amountMajor")}
                  disabled={pending}
                />
                {form.formState.errors.amountMajor && (
                  <span className={styles.upcomingFormError}>{form.formState.errors.amountMajor.message}</span>
                )}
              </label>
              <label className={styles.upcomingFormField}>
                <span className={styles.upcomingFormLabel}>Тип</span>
                <select className={styles.upcomingFormSelect} {...form.register("direction")}
 disabled={pending}>
                  <option value="expense">Расход</option>
                  <option value="income">Доход</option>
                </select>
                {form.formState.errors.direction && (
                  <span className={styles.upcomingFormError}>{form.formState.errors.direction.message}</span>
                )}
              </label>
              <label className={styles.upcomingFormField}>
                <span className={styles.upcomingFormLabel}>Счёт</span>
                <input
                  type="text"
                  className={styles.upcomingFormInput}
                  placeholder="Кошелёк, карта и т.д."
                  {...form.register("accountName")}
                  disabled={pending}
                />
                {form.formState.errors.accountName && (
                  <span className={styles.upcomingFormError}>{form.formState.errors.accountName.message}</span>
                )}
              </label>
            </div>
            <label className={styles.upcomingFormField}>
              <span className={styles.upcomingFormLabel}>Описание</span>
              <textarea
                rows={3}
                className={styles.upcomingFormTextarea}
                placeholder="Дополнительные детали"
                {...form.register("description")}
                disabled={pending}
              />
              {form.formState.errors.description && (
                <span className={styles.upcomingFormError}>{form.formState.errors.description.message}</span>
              )}
            </label>
            <div className={styles.upcomingFormActions}>
              <button type="button" className={styles.upcomingFormSecondary} onClick={handleClose} disabled={pending}>
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSubmitClick}
                className={styles.upcomingFormPrimary}
                disabled={pending}
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
