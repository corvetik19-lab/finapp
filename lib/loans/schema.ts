import { z } from "zod";

// Схема для создания/редактирования кредита
export const loanFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Укажите название кредита").max(100, "Слишком длинное название"),
  bank: z.string().min(1, "Укажите банк").max(100, "Слишком длинное название банка"),
  principalAmount: z.number().positive("Сумма должна быть больше нуля"),
  interestRate: z.number().min(0, "Ставка не может быть отрицательной").max(100, "Неверная ставка"),
  monthlyPayment: z.number().positive("Платёж должен быть больше нуля"),
  issueDate: z.string().min(1, "Укажите дату выдачи"),
  endDate: z.string().optional(),
  termMonths: z.number().int().positive().optional(),
  paymentType: z.enum(["annuity", "differentiated"]).optional(),
  contractNumber: z.string().max(50).optional(),
  nextPaymentDate: z.string().optional(),
});

export type LoanFormData = z.infer<typeof loanFormSchema>;

// Схема для погашения кредита
export const loanRepaymentSchema = z.object({
  loanId: z.string().uuid("Выберите кредит"),
  amount: z.number().positive("Сумма должна быть больше нуля"),
  principalAmount: z.number().nonnegative("Сумма не может быть отрицательной").optional(),
  interestAmount: z.number().nonnegative("Сумма не может быть отрицательной").optional(),
  commission: z.number().nonnegative("Комиссия не может быть отрицательной").optional(),
  paymentDate: z.string().min(1, "Укажите дату платежа"),
  note: z.string().max(200).optional(),
});

export type LoanRepaymentData = z.infer<typeof loanRepaymentSchema>;
