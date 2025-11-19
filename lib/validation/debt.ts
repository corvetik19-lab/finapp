import { z } from "zod";

export const debtFormSchema = z.object({
  type: z.enum(["owe", "owed"]),
  creditor_debtor_name: z.string().min(1, "Укажите имя"),
  amount: z.number().positive("Сумма должна быть положительной"),
  currency: z.string().min(1, "Укажите валюту"),
  date_created: z.string().min(1, "Укажите дату создания"),
  date_due: z.string().optional(),
  description: z.string().optional(),
});

export type DebtFormSchema = z.infer<typeof debtFormSchema>;
