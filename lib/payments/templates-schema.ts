import { z } from "zod";

export const paymentTemplateFormSchema = z.object({
  id: z.string().optional().transform((v) => (v === "" ? undefined : v)).pipe(z.string().uuid().optional()),
  name: z.string().min(1, "Название обязательно").max(100, "Слишком длинное название"),
  amountMajor: z.coerce.number().positive("Сумма должна быть больше 0"),
  direction: z.enum(["income", "expense"]),
  categoryId: z.string().optional().nullable().transform((v) => (v === "" || v === "__none__" ? null : v)),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  linkedCreditCardId: z.string().optional().nullable().transform((v) => (v === "" || v === "__none__" ? null : v)),
  linkedLoanId: z.string().optional().nullable().transform((v) => (v === "" || v === "__none__" ? null : v)),
});

export type PaymentTemplateFormInput = z.input<typeof paymentTemplateFormSchema>;
export type PaymentTemplateFormData = z.infer<typeof paymentTemplateFormSchema>;

export type PaymentTemplate = {
  id: string;
  name: string;
  amountMinor: number;
  currency: string;
  direction: "income" | "expense";
  categoryId: string | null;
  categoryName?: string | null;
  dayOfMonth: number | null;
  description: string | null;
  createdAt: string;
  linkedCreditCardId?: string | null;
  linkedCreditCardName?: string | null;
  linkedLoanId?: string | null;
  linkedLoanName?: string | null;
};
