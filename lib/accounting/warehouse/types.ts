// Типы для складского учёта

export type WarehouseType = 'main' | 'retail' | 'production' | 'transit';
export type DocumentType = 'receipt' | 'shipment' | 'transfer' | 'write_off' | 'inventory' | 'return';
export type DocumentStatus = 'draft' | 'confirmed' | 'cancelled';
export type MovementType = 'in' | 'out' | 'transfer_in' | 'transfer_out';
export type ItemType = 'goods' | 'material' | 'service' | 'work';

// Склад
export interface WarehouseLocation {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  address?: string;
  responsible_person?: string;
  phone?: string;
  warehouse_type: WarehouseType;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Единица измерения
export interface WarehouseUnit {
  id: string;
  company_id: string;
  name: string;
  short_name: string;
  code?: string;
  is_default: boolean;
  created_at: string;
}

// Номенклатура
export interface WarehouseItem {
  id: string;
  company_id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  subcategory?: string;
  item_type: ItemType;
  unit_id?: string;
  unit_name: string;
  purchase_price: number;
  sale_price: number;
  selling_price: number;
  vat_rate: number;
  min_stock: number;
  tender_id?: string;
  account_id?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Остаток на складе
export interface WarehouseStock {
  id: string;
  company_id: string;
  warehouse_id: string;
  item_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  average_cost: number;
  total_cost: number;
  total_value: number;
  min_quantity?: number;
  updated_at: string;
  
  warehouse?: WarehouseLocation;
  item?: WarehouseItem;
}

// Складской документ
export interface WarehouseDocument {
  id: string;
  company_id: string;
  document_type: DocumentType;
  document_number: string;
  document_date: string;
  warehouse_id?: string;
  target_warehouse_id?: string;
  counterparty_id?: string;
  counterparty_name?: string;
  source_document_type?: string;
  source_document_id?: string;
  total_quantity: number;
  total_amount: number;
  status: DocumentStatus;
  tender_id?: string;
  notes?: string;
  created_by?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
  
  warehouse?: WarehouseLocation;
  target_warehouse?: WarehouseLocation;
  counterparty?: { id: string; short_name?: string; full_name?: string };
  items?: WarehouseDocumentItem[];
}

// Позиция документа
export interface WarehouseDocumentItem {
  id: string;
  document_id: string;
  item_id: string;
  quantity: number;
  price: number;
  amount: number;
  vat_rate: number;
  vat_amount?: number;
  position: number;
  notes?: string;
  created_at: string;
  
  item?: WarehouseItem;
}

// Движение товара
export interface WarehouseMovement {
  id: string;
  company_id: string;
  movement_type: MovementType;
  warehouse_id: string;
  item_id: string;
  quantity: number;
  unit_cost: number;
  balance_after: number;
  document_id?: string;
  document_item_id?: string;
  movement_date: string;
  notes?: string;
  created_at: string;
  
  warehouse?: WarehouseLocation;
  item?: WarehouseItem;
}

// Input типы
export interface CreateWarehouseInput {
  name: string;
  code?: string;
  address?: string;
  responsible_person?: string;
  warehouse_type?: WarehouseType;
  notes?: string;
}

export interface CreateItemInput {
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  subcategory?: string;
  unit_name?: string;
  purchase_price?: number;
  selling_price?: number;
  vat_rate?: number;
  min_stock?: number;
  tender_id?: string;
  notes?: string;
}

export interface CreateDocumentInput {
  document_type: DocumentType;
  document_date: string;
  warehouse_id: string;
  target_warehouse_id?: string;
  counterparty_id?: string;
  counterparty_name?: string;
  tender_id?: string;
  notes?: string;
  items: CreateDocumentItemInput[];
}

export interface CreateDocumentItemInput {
  item_id: string;
  quantity: number;
  price: number;
  vat_rate?: number;
  notes?: string;
}

// Сводка по складу
export interface WarehouseSummary {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

// Лейблы
export const warehouseTypeLabels: Record<WarehouseType, string> = {
  main: 'Основной',
  retail: 'Розничный',
  production: 'Производственный',
  transit: 'Транзитный',
};

export const documentTypeLabels: Record<DocumentType, string> = {
  receipt: 'Приходная накладная',
  shipment: 'Расходная накладная',
  transfer: 'Перемещение',
  write_off: 'Списание',
  inventory: 'Инвентаризация',
  return: 'Возврат',
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  draft: 'Черновик',
  confirmed: 'Проведён',
  cancelled: 'Отменён',
};

export const movementTypeLabels: Record<MovementType, string> = {
  in: 'Приход',
  out: 'Расход',
  transfer_in: 'Приход (перемещение)',
  transfer_out: 'Расход (перемещение)',
};

export const itemTypeLabels: Record<ItemType, string> = {
  goods: 'Товар',
  material: 'Материал',
  service: 'Услуга',
  work: 'Работа',
};
