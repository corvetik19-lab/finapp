import { z } from "zod";

export const transactionSchema = z.object({
  direction: z.enum(["income", "expense"]).default("expense"),
  account_id: z.string().uuid({ message: "Выберите счёт" }),
  category_id: z.string().uuid().optional().nullable(),
  amount_major: z
    .preprocess((v) => (typeof v === "string" ? v.replace(/,/g, ".") : v), z.coerce.number().positive("Сумма должна быть больше 0"))
    .describe("Сумма в рублях, дробная часть через точку"),
  currency: z.string().min(3).max(3).default("RUB"),
  occurred_at: z.string().optional(),
  note: z.string().optional().nullable(),
  counterparty: z.string().optional().nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

const amountStringSchema = z
  .string()
  .min(1, "Введите сумму")
  .refine((val) => {
    const normalized = val.replace(/\s+/g, "").replace(",", ".");
    const num = Number(normalized);
    return Number.isFinite(num) && num > 0;
  }, "Сумма должна быть больше 0");

const optionalUuid = z.union([z.string().uuid(), z.literal(""), z.null()]);

export const transactionFormSchema = z.object({
  direction: z.enum(["income", "expense"]),
  account_id: z.string().uuid({ message: "Выберите счёт" }),
  category_id: optionalUuid.optional(),
  amount_major: amountStringSchema,
  currency: z.string().min(3).max(3),
  occurred_at: z.string().min(1, "Укажите дату"),
  note: z.string().optional().nullable(),
  counterparty: z.string().optional().nullable(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export const transactionEditFormSchema = transactionFormSchema.extend({
  id: z.string().uuid({ message: "Нет идентификатора транзакции" }),
});

export type TransactionEditFormValues = z.infer<typeof transactionEditFormSchema>;

export const transferSchema = z.object({
  from_account_id: z.string().uuid({ message: "Выберите счёт-источник" }),
  to_account_id: z.string().uuid({ message: "Выберите счёт-назначение" }),
  amount_major: z
    .preprocess((v) => (typeof v === "string" ? v.replace(/,/g, ".") : v), z.coerce.number().positive("Сумма должна быть больше 0"))
    .describe("Сумма в рублях, дробная часть через точку"),
  currency: z.string().min(3).max(3).default("RUB"),
  occurred_at: z.string().optional(),
  note: z.string().optional().nullable(),
});

export type TransferInput = z.infer<typeof transferSchema>;

export const transferFormSchema = z.object({
  from_account_id: z.string().uuid({ message: "Выберите счёт-источник" }),
  to_account_id: z.string().uuid({ message: "Выберите счёт-назначение" }),
  amount_major: amountStringSchema,
  currency: z.string().min(3).max(3),
  occurred_at: z.string().min(1, "Укажите дату"),
  note: z.string().optional().nullable(),
});

export type TransferFormValues = z.infer<typeof transferFormSchema>;
