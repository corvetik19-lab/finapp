import { z } from "zod";

const limitAmountTransform = z
  .string()
  .min(1, "Введите лимит")
  .transform((value) => {
    const normalized = value.replace(/\s+/g, "").replace(",", ".");
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: "Лимит должен быть больше 0",
          path: ["limit_amount"],
        },
      ]);
    }
    return parsed;
  });

export const budgetFormSchema = z
  .object({
    category_id: z.string().uuid({ message: "Выберите категорию" }),
    period_start: z
      .string()
      .min(1, "Укажите дату начала"),
    period_end: z
      .string()
      .min(1, "Укажите дату окончания"),
    limit_amount: limitAmountTransform,
    currency: z.string().min(3).max(3).default("RUB"),
  })
  .superRefine((data, ctx) => {
    const start = new Date(`${data.period_start}T00:00:00Z`);
    const end = new Date(`${data.period_end}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Некорректные даты периода",
        path: ["period_start"],
      });
      return;
    }
    if (end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Дата окончания должна быть не раньше даты начала",
        path: ["period_end"],
      });
    }
  });

export type BudgetFormInput = z.input<typeof budgetFormSchema>;
export type BudgetFormData = z.infer<typeof budgetFormSchema>;
