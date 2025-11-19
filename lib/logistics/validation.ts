import { z } from "zod";

// Схемы валидации для логистики
export const shipmentFormSchema = z.object({
  type: z.enum(['standard', 'express', 'overnight', 'freight']),
  
  // Отправитель
  sender_name: z.string().min(1, "Укажите имя отправителя"),
  sender_phone: z.string().optional(),
  sender_email: z.union([z.string().email(), z.literal("")]).optional(),
  sender_company: z.string().optional(),
  sender_street: z.string().min(1, "Укажите адрес отправителя"),
  sender_city: z.string().min(1, "Укажите город отправителя"),
  sender_region: z.string().optional(),
  sender_postal_code: z.string().optional(),
  sender_country: z.string().min(1, "Укажите страну"),
  
  // Получатель
  recipient_name: z.string().min(1, "Укажите имя получателя"),
  recipient_phone: z.string().optional(),
  recipient_email: z.union([z.string().email(), z.literal("")]).optional(),
  recipient_company: z.string().optional(),
  recipient_street: z.string().min(1, "Укажите адрес получателя"),
  recipient_city: z.string().min(1, "Укажите город получателя"),
  recipient_region: z.string().optional(),
  recipient_postal_code: z.string().optional(),
  recipient_country: z.string().min(1, "Укажите страну"),
  
  // Груз
  description: z.string().min(1, "Опишите груз"),
  weight_kg: z.number().positive().optional(),
  length_cm: z.number().positive().optional(),
  width_cm: z.number().positive().optional(),
  height_cm: z.number().positive().optional(),
  value_amount: z.number().positive().optional(),
  
  // Даты
  pickup_date: z.string().optional(),
  estimated_delivery: z.string().optional(),
  
  // Финансы  
  cost_amount: z.number().min(0, "Стоимость не может быть отрицательной"),
  currency: z.string().default('RUB'),
  
  // Исполнители
  driver_id: z.string().optional(),
  courier_company: z.string().optional(),
  
  // Дополнительно
  notes: z.string().optional(),
  special_instructions: z.string().optional(),
});

export const driverFormSchema = z.object({
  name: z.string().min(1, "Укажите имя водителя"),
  phone: z.string().min(1, "Укажите телефон"),
  license_number: z.string().min(1, "Укажите номер водительского удостоверения"),
  vehicle_brand: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_number: z.string().optional(),
  vehicle_capacity_kg: z.number().positive().optional(),
  is_active: z.boolean().default(true),
});

export type ShipmentFormInput = z.infer<typeof shipmentFormSchema>;
export type DriverFormInput = z.infer<typeof driverFormSchema>;
