import { z } from 'zod';

/**
 * Схема валидации для создания тендера
 */
export const createTenderSchema = z.object({
  // Обязательные поля
  company_id: z.string().uuid('Неверный ID компании'),
  purchase_number: z
    .string()
    .min(1, 'Номер закупки обязателен')
    .max(100, 'Максимум 100 символов'),
  subject: z
    .string()
    .min(3, 'Минимум 3 символа')
    .max(500, 'Максимум 500 символов'),
  customer: z
    .string()
    .min(3, 'Минимум 3 символа')
    .max(200, 'Максимум 200 символов'),
  nmck: z
    .number()
    .positive('Должно быть положительным числом')
    .min(0.01, 'НМЦК обязательна'),
  submission_deadline: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Неверная дата'),

  // Опциональные поля
  stage_id: z.string().uuid().optional().nullable(), // Этап определяется автоматически на основе шаблона
  project_name: z.string().max(200).optional().nullable(),
  method: z.string().max(100).optional().nullable(),
  type_id: z.string().uuid().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  platform: z.string().max(100).optional().nullable(),
  our_price: z.number().positive().optional().nullable(),
  contract_price: z.number().positive().optional().nullable(),
  application_security: z.number().positive().optional().nullable(),
  contract_security: z.number().positive().optional().nullable(),
  auction_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Неверная дата')
    .optional()
    .nullable(),
  results_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Неверная дата')
    .optional()
    .nullable(),
  review_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Неверная дата')
    .optional()
    .nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  specialist_id: z.string().uuid().optional().nullable(),
  investor_id: z.string().uuid().optional().nullable(),
  executor_id: z.string().uuid().optional().nullable(),
  
  // Множественные ответственные (новый подход)
  responsible_ids: z.array(z.string().uuid()).default([]),
  
  comment: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Схема валидации для обновления тендера (все поля опциональны)
 */
export const updateTenderSchema = z.object({
  project_name: z.string().max(200).optional().nullable(),
  subject: z.string().min(3).max(500).optional(),
  method: z.string().max(100).optional().nullable(),
  type_id: z.string().uuid().optional().nullable(),
  customer: z.string().min(3).max(200).optional(),
  city: z.string().max(100).optional().nullable(),
  platform: z.string().max(100).optional().nullable(),
  nmck: z.number().positive().optional(),
  our_price: z.number().positive().optional().nullable(),
  contract_price: z.number().positive().optional().nullable(),
  application_security: z.number().positive().optional().nullable(),
  contract_security: z.number().positive().optional().nullable(),
  submission_deadline: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Неверная дата')
    .optional(),
  auction_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Неверная дата')
    .optional()
    .nullable(),
  results_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Неверная дата')
    .optional()
    .nullable(),
  review_date: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Неверная дата')
    .optional()
    .nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  specialist_id: z.string().uuid().optional().nullable(),
  investor_id: z.string().uuid().optional().nullable(),
  executor_id: z.string().uuid().optional().nullable(),
  
  // Множественные ответственные
  responsible_ids: z.array(z.string().uuid()).optional(),
  
  stage_id: z.string().uuid().optional(),
  status: z.enum(['active', 'won', 'lost', 'archived']).optional(),
  comment: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateTenderFormData = z.infer<typeof createTenderSchema>;
export type UpdateTenderFormData = z.infer<typeof updateTenderSchema>;
