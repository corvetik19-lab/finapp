import { z } from "zod";

// Схема для формы создания/редактирования отчёта
export const reportFormSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  category: z.enum(["income_expense", "cash_flow", "balance", "budget", "category", "custom"]),
  period: z.enum(["today", "week", "month", "quarter", "year", "custom"]),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  dataTypes: z.array(z.string()).default([]),
  categories: z.array(z.string()).optional(),
  accounts: z.array(z.string()).optional(),
  reportType: z.enum(["table", "chart", "summary"]).default("table"),
  format: z.enum(["screen", "pdf", "excel", "csv"]).default("screen"),
  note: z.string().optional(),
});

// Схема для генерации данных отчёта
export const reportGenerateSchema = z.object({
  period: z.enum(["today", "week", "month", "quarter", "year", "custom"]),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  dataTypes: z.array(z.string()).default([]),
  categories: z.array(z.string()).optional(),
  accounts: z.array(z.string()).optional(),
  reportType: z.enum(["table", "chart", "summary"]).default("table"),
});

export type ReportFormInput = z.infer<typeof reportFormSchema>;
export type ReportGenerateInput = z.infer<typeof reportGenerateSchema>;
