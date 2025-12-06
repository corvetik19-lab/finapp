"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BudgetWithUsage } from "@/lib/budgets/service";
import type { CategoryRecord } from "@/lib/categories/service";
import { createBudgetAction } from "@/app/(protected)/finance/dashboard/actions";

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
    return <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-lg">Добавьте категории расходов, чтобы создавать бюджеты.</div>;
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="budgetCategory">Категория</Label>
        <Select onValueChange={(v) => register("categoryId").onChange({ target: { value: v } })} defaultValue={categories[0]?.id} disabled={isPending}>
          <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
          <SelectContent>{categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
        </Select>
        {errors.categoryId && <span className="text-sm text-destructive">{errors.categoryId.message}</span>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="budgetLimit">Лимит ({currency})</Label>
        <Input type="number" id="budgetLimit" placeholder="Например, 25000" step="0.01" min="0" {...register("limitMajor", { valueAsNumber: true })} disabled={isPending} />
        {errors.limitMajor && <span className="text-sm text-destructive">{errors.limitMajor.message}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label htmlFor="budgetStart">Дата начала</Label><Input type="date" id="budgetStart" {...register("periodStart")} disabled={isPending} />{errors.periodStart && <span className="text-sm text-destructive">{errors.periodStart.message}</span>}</div>
        <div className="space-y-2"><Label htmlFor="budgetEnd">Дата окончания</Label><Input type="date" id="budgetEnd" {...register("periodEnd")} disabled={isPending} />{errors.periodEnd && <span className="text-sm text-destructive">{errors.periodEnd.message}</span>}</div>
      </div>
      {errorMessage && <div className="text-sm text-destructive">{errorMessage}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Отмена</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Сохранение..." : "Сохранить"}</Button>
      </div>
    </form>
  );
}
