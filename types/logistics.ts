// Типы для логистической системы

export type ShipmentStatus = 
  | 'draft'        // Черновик
  | 'confirmed'    // Подтверждено  
  | 'picked_up'    // Забрано
  | 'in_transit'   // В пути
  | 'delivered'    // Доставлено
  | 'cancelled'    // Отменено
  | 'returned';    // Возврат

export type ShipmentType = 
  | 'standard'     // Обычная доставка
  | 'express'      // Экспресс доставка
  | 'overnight'    // За ночь
  | 'freight';     // Грузоперевозки

export type PaymentStatus = 
  | 'pending'      // Ожидает оплаты
  | 'paid'         // Оплачено
  | 'overdue'      // Просрочено
  | 'cancelled';   // Отменено

export interface Address {
  street: string;
  city: string;
  region?: string;
  postal_code?: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Contact {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
}

export interface Driver {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  license_number: string;
  vehicle_info?: {
    brand: string;
    model: string;
    number: string;
    capacity_kg?: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  user_id: string;
  
  // Основная информация
  tracking_number: string;
  status: ShipmentStatus;
  type: ShipmentType;
  
  // Отправитель и получатель
  sender: Contact;
  sender_address: Address;
  recipient: Contact;
  recipient_address: Address;
  
  // Груз
  description: string;
  weight_kg?: number;
  dimensions?: {
    length_cm: number;
    width_cm: number;
    height_cm: number;
  };
  value_amount?: number; // в копейках
  
  // Даты
  pickup_date?: string;
  delivery_date?: string;
  estimated_delivery?: string;
  
  // Финансы
  cost_amount: number; // в копейках
  currency: string;
  payment_status: PaymentStatus;
  
  // Исполнители
  driver_id?: string;
  courier_company?: string;
  
  // Дополнительно
  notes?: string;
  special_instructions?: string;
  
  // Связанные данные (при join)
  driver?: Driver;
  
  created_at: string;
  updated_at: string;
}

export interface ShipmentStatusHistory {
  id: string;
  shipment_id: string;
  status: ShipmentStatus;
  timestamp: string;
  location?: string;
  notes?: string;
  user_id?: string;
}

// Названия статусов для UI
export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  draft: 'Черновик',
  confirmed: 'Подтверждено',
  picked_up: 'Забрано',
  in_transit: 'В пути',
  delivered: 'Доставлено', 
  cancelled: 'Отменено',
  returned: 'Возврат',
};

export const SHIPMENT_TYPE_LABELS: Record<ShipmentType, string> = {
  standard: 'Обычная',
  express: 'Экспресс',
  overnight: 'За ночь',
  freight: 'Грузоперевозки',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачено',
  overdue: 'Просрочено',
  cancelled: 'Отменено',
};

// Цвета для статусов
export const STATUS_COLORS = {
  draft: '#94a3b8',
  confirmed: '#3b82f6', 
  picked_up: '#f59e0b',
  in_transit: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
  returned: '#f97316',
} as const;
