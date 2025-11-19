import { z } from "zod";
import { createRSCClient, createRouteClient } from "@/lib/supabase/helpers";
import { Shipment, Driver, ShipmentStatusHistory, ShipmentStatus } from "@/types/logistics";

// Схемы валидации
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

// Сервис для работы с отправками
export async function getShipments(): Promise<Shipment[]> {
  const supabase = await createRSCClient();
  const { data, error } = await supabase
    .from('shipments')
    .select(`
      *,
      driver:drivers(*)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(transformShipmentFromDB) as Shipment[];
}

export async function getShipment(id: string): Promise<Shipment | null> {
  const supabase = await createRSCClient();
  const { data, error } = await supabase
    .from('shipments')
    .select(`
      *,
      driver:drivers(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) return null;
  return transformShipmentFromDB(data) as Shipment;
}

export async function createShipment(input: ShipmentFormInput): Promise<Shipment> {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  // Преобразуем суммы в копейки
  const costMinor = Math.round((input.cost_amount || 0) * 100);
  const valueMinor = input.value_amount ? Math.round(input.value_amount * 100) : null;

  const { data, error } = await supabase
    .from('shipments')
    .insert({
      user_id: user.id,
      type: input.type,
      
      // Отправитель
      sender_name: input.sender_name,
      sender_phone: input.sender_phone,
      sender_email: input.sender_email,
      sender_company: input.sender_company,
      sender_street: input.sender_street,
      sender_city: input.sender_city,
      sender_region: input.sender_region,
      sender_postal_code: input.sender_postal_code,
      sender_country: input.sender_country,
      
      // Получатель
      recipient_name: input.recipient_name,
      recipient_phone: input.recipient_phone,
      recipient_email: input.recipient_email,
      recipient_company: input.recipient_company,
      recipient_street: input.recipient_street,
      recipient_city: input.recipient_city,
      recipient_region: input.recipient_region,
      recipient_postal_code: input.recipient_postal_code,
      recipient_country: input.recipient_country,
      
      // Груз
      description: input.description,
      weight_kg: input.weight_kg,
      length_cm: input.length_cm,
      width_cm: input.width_cm,
      height_cm: input.height_cm,
      value_amount: valueMinor,
      
      // Даты
      pickup_date: input.pickup_date,
      estimated_delivery: input.estimated_delivery,
      
      // Финансы
      cost_amount: costMinor,
      currency: input.currency,
      
      // Исполнители
      driver_id: input.driver_id,
      courier_company: input.courier_company,
      
      // Дополнительно
      notes: input.notes,
      special_instructions: input.special_instructions,
    })
    .select()
    .single();

  if (error) throw error;
  return transformShipmentFromDB(data) as Shipment;
}

export async function updateShipmentStatus(id: string, status: ShipmentStatus, notes?: string): Promise<Shipment> {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const { data, error } = await supabase
    .from('shipments')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;

  // Добавляем запись в историю если есть дополнительные заметки
  if (notes) {
    await supabase
      .from('shipment_status_history')
      .insert({
        shipment_id: id,
        status,
        notes,
        user_id: user.id,
      });
  }

  return transformShipmentFromDB(data) as Shipment;
}

export async function deleteShipment(id: string): Promise<void> {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const { error } = await supabase
    .from('shipments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

// Сервис для работы с водителями
export async function getDrivers(): Promise<Driver[]> {
  const supabase = await createRSCClient();
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('name');

  if (error) throw error;
  return data.map(transformDriverFromDB) as Driver[];
}

export async function createDriver(input: DriverFormInput): Promise<Driver> {
  const supabase = await createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw authError ?? new Error("Нет пользователя");

  const { data, error } = await supabase
    .from('drivers')
    .insert({
      user_id: user.id,
      name: input.name,
      phone: input.phone,
      license_number: input.license_number,
      vehicle_brand: input.vehicle_brand,
      vehicle_model: input.vehicle_model,
      vehicle_number: input.vehicle_number,
      vehicle_capacity_kg: input.vehicle_capacity_kg,
      is_active: input.is_active,
    })
    .select()
    .single();

  if (error) throw error;
  return transformDriverFromDB(data) as Driver;
}

// История статусов
export async function getShipmentHistory(shipmentId: string): Promise<ShipmentStatusHistory[]> {
  const supabase = await createRSCClient();
  const { data, error } = await supabase
    .from('shipment_status_history')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data as ShipmentStatusHistory[];
}

// Утилиты для преобразования данных
function transformShipmentFromDB(dbData: Record<string, unknown>): Shipment {
  return {
    ...dbData,
    sender: {
      name: dbData.sender_name as string,
      phone: dbData.sender_phone as string | undefined,
      email: dbData.sender_email as string | undefined,
      company: dbData.sender_company as string | undefined,
    },
    sender_address: {
      street: dbData.sender_street as string,
      city: dbData.sender_city as string,
      region: dbData.sender_region as string | undefined,
      postal_code: dbData.sender_postal_code as string | undefined,
      country: dbData.sender_country as string,
      coordinates: dbData.sender_lat && dbData.sender_lng ? {
        lat: dbData.sender_lat as number,
        lng: dbData.sender_lng as number,
      } : undefined,
    },
    recipient: {
      name: dbData.recipient_name as string,
      phone: dbData.recipient_phone as string | undefined,
      email: dbData.recipient_email as string | undefined,
      company: dbData.recipient_company as string | undefined,
    },
    recipient_address: {
      street: dbData.recipient_street as string,
      city: dbData.recipient_city as string,
      region: dbData.recipient_region as string | undefined,
      postal_code: dbData.recipient_postal_code as string | undefined,
      country: dbData.recipient_country as string,
      coordinates: dbData.recipient_lat && dbData.recipient_lng ? {
        lat: dbData.recipient_lat as number,
        lng: dbData.recipient_lng as number,
      } : undefined,
    },
    dimensions: dbData.length_cm && dbData.width_cm && dbData.height_cm ? {
      length_cm: dbData.length_cm as number,
      width_cm: dbData.width_cm as number,
      height_cm: dbData.height_cm as number,
    } : undefined,
    cost_amount: (dbData.cost_amount as number) || 0,
    value_amount: (dbData.value_amount as number | undefined) || undefined,
  } as Shipment;
}

function transformDriverFromDB(dbData: Record<string, unknown>): Driver {
  return {
    ...dbData,
    vehicle_info: dbData.vehicle_brand ? {
      brand: dbData.vehicle_brand as string,
      model: dbData.vehicle_model as string,
      number: dbData.vehicle_number as string,
      capacity_kg: dbData.vehicle_capacity_kg as number | undefined,
    } : undefined,
  } as Driver;
}
