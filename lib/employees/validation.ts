import { z } from 'zod';

/**
 * Схема валидации для создания сотрудника
 */
export const createEmployeeSchema = z.object({
  // Обязательные поля
  company_id: z.string().uuid('Неверный ID компании'),
  full_name: z
    .string()
    .min(2, 'Минимум 2 символа')
    .max(200, 'Максимум 200 символов'),
  email: z
    .string()
    .email('Неверный формат email')
    .toLowerCase(),
  role: z.enum(['admin', 'manager', 'tender_specialist', 'accountant', 'logistics', 'viewer'] as const),
  
  // Опциональные поля
  phone: z.string().max(20).optional().nullable(),
  telegram: z.string().max(100).optional().nullable(),
  birth_date: z
    .string()
    .transform((val) => val === '' ? null : val)
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Неверная дата')
    .optional()
    .nullable(),
  position: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  status: z.enum(['active', 'inactive', 'vacation', 'dismissed'] as const).optional(),
  hire_date: z
    .string()
    .transform((val) => val === '' ? null : val)
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Неверная дата')
    .optional()
    .nullable(),
  work_schedule: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  
  // Для создания учетной записи
  create_user_account: z.boolean().optional(),
  password: z
    .string()
    .min(8, 'Минимум 8 символов')
    .max(100, 'Максимум 100 символов')
    .optional()
    .nullable(),
});

/**
 * Схема валидации для обновления сотрудника
 */
export const updateEmployeeSchema = z.object({
  full_name: z.string().min(2).max(200).optional(),
  email: z.string().email().toLowerCase().optional(),
  phone: z.string().max(20).optional().nullable(),
  telegram: z.string().max(100).optional().nullable(),
  birth_date: z
    .string()
    .transform((val) => val === '' ? null : val)
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Неверная дата')
    .optional()
    .nullable(),
  avatar_url: z.string().url().optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  employee_number: z.string().max(50).optional().nullable(),
  hire_date: z
    .string()
    .transform((val) => val === '' ? null : val)
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Неверная дата')
    .optional()
    .nullable(),
  dismissal_date: z
    .string()
    .transform((val) => val === '' ? null : val)
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Неверная дата')
    .optional()
    .nullable(),
  role: z.enum(['admin', 'manager', 'tender_specialist', 'accountant', 'logistics', 'viewer'] as const).optional(),
  status: z.enum(['active', 'inactive', 'vacation', 'dismissed'] as const).optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
  address: z.string().max(500).optional().nullable(),
  emergency_contact: z.string().max(200).optional().nullable(),
  emergency_phone: z.string().max(20).optional().nullable(),
  salary_amount: z.number().positive().optional().nullable(),
  work_schedule: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Схема валидации для добавления навыка
 */
export const createSkillSchema = z.object({
  employee_id: z.string().uuid(),
  company_id: z.string().uuid(),
  skill_name: z.string().min(2).max(100),
  skill_level: z.number().int().min(1).max(5),
  description: z.string().max(500).optional().nullable(),
});

export type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeFormData = z.infer<typeof updateEmployeeSchema>;
export type CreateSkillFormData = z.infer<typeof createSkillSchema>;
