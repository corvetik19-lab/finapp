import { z } from "zod";

const dueDateRefinement = (value: string) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const upcomingPaymentFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Укажите название"),
  dueDate: z
    .string()
    .min(1, "Укажите дату")
    .refine(dueDateRefinement, "Некорректная дата"),
  amountMajor: z.coerce.number().gt(0, "Сумма должна быть больше нуля"),
  direction: z.enum(["income", "expense"] as const),
  accountName: optionalText(120, "Слишком длинное название счёта"),
  description: optionalText(10, "Описание максимум 10 символов"),
});

export type UpcomingPaymentFormInput = z.input<typeof upcomingPaymentFormSchema>;
export type UpcomingPaymentFormData = z.infer<typeof upcomingPaymentFormSchema>;
