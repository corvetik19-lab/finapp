"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import styles from "@/components/dashboard/Dashboard.module.css";
import type { BudgetWithUsage } from "@/lib/budgets/service";
import type { CategoryRecord } from "@/lib/categories/service";
import { createBudgetAction } from "@/app/(protected)/dashboard/actions";

const formSchema = z.object({
  categoryId: z.string().min(1, "Выберите категорию"),
  limitMajor: z
    .number()
    .refine((value) => Number.isFinite(value), { message: "Введите сумму" })
    .refine((value) => value > 0, { message: "Сумма должна быть больше нуля" }),
  currency: z.string().min(1, "Укажите валюту"),
  periodStart: z.string().min(1, "Укажите дату начала"),
  periodEnd: z.string().min(1, "Укажите дату окончания"),
});

export type BudgetQuickAddFormValues = z.infer<typeof formSchema>;

export type BudgetQuickAddFormProps = {
  currency: string;
  categories: CategoryRecord[];
  onSuccess: (budget: BudgetWithUsage) => void;
  onCancel: () => void;
};

function formatISO(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = new Date();
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

export default function BudgetQuickAddForm({
  currency,
  categories,
  onSuccess,
  onCancel,
}: BudgetQuickAddFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BudgetQuickAddFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: categories[0]?.id ?? "",
      limitMajor: 0,
      currency,
      periodStart: formatISO(startOfMonth),
      periodEnd: formatISO(endOfMonth),
    },
  });

  const onSubmit = (values: BudgetQuickAddFormValues) => {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await createBudgetAction(values);
      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      onSuccess(result.budget);
      reset({
        categoryId: categories[0]?.id ?? "",
        limitMajor: 0,
        currency,
        periodStart: formatISO(startOfMonth),
        periodEnd: formatISO(endOfMonth),
      });
    });
  };

  if (categories.length === 0) {
    return (
      <div className={styles.budgetFormError}>
        Добавьте категории расходов, чтобы создавать бюджеты.
      </div>
    );
  }

  return (
    <form className={styles.budgetForm} onSubmit={handleSubmit(onSubmit)}>
      <div className={styles.field}>
        <label htmlFor="budgetCategory">Категория</label>
        <select
          id="budgetCategory"
          {...register("categoryId")}
          disabled={isPending}
        >
          <option value="">Выберите категорию</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <span className={styles.budgetFormError}>{errors.categoryId.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="budgetLimit">Лимит ({currency})</label>
        <input
          type="number"
          id="budgetLimit"
          placeholder="Например, 25000"
          step="0.01"
          min="0"
          {...register("limitMajor", { valueAsNumber: true })}
          disabled={isPending}
        />
        {errors.limitMajor && (
          <span className={styles.budgetFormError}>{errors.limitMajor.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="budgetStart">Дата начала</label>
        <input
          type="date"
          id="budgetStart"
          {...register("periodStart")}
          disabled={isPending}
        />
        {errors.periodStart && (
          <span className={styles.budgetFormError}>{errors.periodStart.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="budgetEnd">Дата окончания</label>
        <input
          type="date"
          id="budgetEnd"
          {...register("periodEnd")}
          disabled={isPending}
        />
        {errors.periodEnd && (
          <span className={styles.budgetFormError}>{errors.periodEnd.message}</span>
        )}
      </div>

      {errorMessage && (
        <div className={styles.budgetFormError}>{errorMessage}</div>
      )}

      <div className={styles.budgetFormActions}>
        <button
          type="button"
          className={`${styles.budgetFormButton} ${styles.secondaryButton}`}
          onClick={onCancel}
          disabled={isPending}
        >
          Отмена
        </button>
        <button
          type="submit"
          className={`${styles.budgetFormButton} ${styles.primaryButton}`}
          disabled={isPending}
        >
          {isPending ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
