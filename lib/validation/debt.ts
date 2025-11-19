import { z } from "zod";

export const debtFormSchema = z.object({
  type: z.enum(["owe", "owed"]),
  creditor_debtor_name: z.string().min(1, "Укажите имя"),
  amount: z.number().positive("Сумма должна быть положительной"),
  currency: z.string().default("RUB"),
  date_created: z.string().min(1, "Укажите дату создания"),
  date_due: z.string().optional(),
  description: z.string().optional(),
  
  // Новые поля для претензионной работы
  tender_id: z.string().optional(),
  application_number: z.string().optional(),
  contract_number: z.string().optional(),
  stage: z.enum(["new", "claim", "court", "writ", "bailiff", "paid"]).default("new"),
  plaintiff: z.string().optional(),
  defendant: z.string().optional(),
  comments: z.string().optional(),
});

export type DebtFormSchema = z.infer<typeof debtFormSchema>;
