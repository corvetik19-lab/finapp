// Типы для справочника заказчиков

export type CustomerType = 'government' | 'commercial' | 'municipal';

export interface Customer {
  id: string;
  organization_id: string;
  
  // Основная информация
  name: string;
  short_name: string | null;
  
  // Реквизиты
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  
  // Адреса
  legal_address: string | null;
  actual_address: string | null;
  region: string | null;
  
  // Контакты
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  
  // Дополнительно
  customer_type: CustomerType;
  notes: string | null;
  is_active: boolean;
  
  // Метаданные
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CustomerInput {
  name: string;
  short_name?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  legal_address?: string | null;
  actual_address?: string | null;
  region?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  customer_type?: CustomerType;
  notes?: string | null;
  is_active?: boolean;
}

export interface CustomerFilters {
  search?: string;
  customer_type?: CustomerType | 'all';
  is_active?: boolean | 'all';
  region?: string;
}

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  government: 'Государственный',
  commercial: 'Коммерческий',
  municipal: 'Муниципальный',
};

export const CUSTOMER_TYPE_COLORS: Record<CustomerType, string> = {
  government: '#3b82f6', // blue
  commercial: '#22c55e', // green
  municipal: '#f59e0b', // amber
};
