// Типы для бухгалтерского модуля

// ============================================
// Формы организаций
// ============================================
export type OrganizationType = 'ip' | 'ooo' | 'ao';

export const ORGANIZATION_TYPES: Record<OrganizationType, string> = {
  ip: 'ИП (Индивидуальный предприниматель)',
  ooo: 'ООО (Общество с ограниченной ответственностью)',
  ao: 'АО (Акционерное общество)',
};

// ============================================
// Системы налогообложения
// ============================================
export type TaxSystem = 'osno' | 'usn_income' | 'usn_income_expense' | 'psn' | 'ausn';

export const TAX_SYSTEMS: Record<TaxSystem, { name: string; description: string; rate?: number }> = {
  osno: {
    name: 'ОСНО',
    description: 'Общая система налогообложения (НДС + налог на прибыль)',
  },
  usn_income: {
    name: 'УСН Доходы',
    description: 'Упрощённая система (6% от доходов)',
    rate: 6,
  },
  usn_income_expense: {
    name: 'УСН Доходы-Расходы',
    description: 'Упрощённая система (15% от прибыли)',
    rate: 15,
  },
  psn: {
    name: 'ПСН',
    description: 'Патентная система (только для ИП)',
  },
  ausn: {
    name: 'АУСН',
    description: 'Автоматизированная УСН',
  },
};

// ============================================
// Ставки НДС
// ============================================
export type VatRate = 0 | 10 | 20;

export const VAT_RATES: { value: VatRate; label: string }[] = [
  { value: 0, label: 'Без НДС (0%)' },
  { value: 10, label: 'НДС 10%' },
  { value: 20, label: 'НДС 20%' },
];

// ============================================
// Настройки бухгалтерии
// ============================================
export interface AccountingSettings {
  id: string;
  company_id: string;
  
  // Форма организации
  organization_type: OrganizationType;
  
  // Реквизиты
  full_name: string;
  short_name: string | null;
  inn: string;
  kpp: string | null;
  ogrn: string | null;
  okpo: string | null;
  okved: string | null;
  
  // Адреса
  legal_address: string | null;
  actual_address: string | null;
  
  // Банковские реквизиты
  bank_name: string | null;
  bank_bik: string | null;
  bank_account: string | null;
  bank_corr_account: string | null;
  
  // Руководитель
  director_name: string | null;
  director_position: string;
  accountant_name: string | null;
  
  // Налогообложение
  tax_system: TaxSystem;
  vat_payer: boolean;
  vat_rate: VatRate;
  
  // Настройки УСН
  usn_rate: number;
  usn_min_tax_rate: number;
  
  // Нумерация документов
  invoice_prefix: string;
  invoice_next_number: number;
  act_prefix: string;
  act_next_number: number;
  waybill_prefix: string;
  waybill_next_number: number;
  upd_prefix: string;
  upd_next_number: number;
  contract_prefix: string;
  contract_next_number: number;
  
  fiscal_year_start: number;
  
  // Печать и подпись (URL из Storage)
  stamp_url: string | null;
  signature_url: string | null;
  
  created_at: string;
  updated_at: string;
}

// ============================================
// Контрагенты
// ============================================
export interface AccountingCounterparty {
  id: string;
  company_id: string;
  
  name: string;
  short_name: string | null;
  organization_type: OrganizationType;
  
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  
  legal_address: string | null;
  actual_address: string | null;
  
  bank_name: string | null;
  bank_bik: string | null;
  bank_account: string | null;
  bank_corr_account: string | null;
  
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  
  is_customer: boolean;
  is_supplier: boolean;
  
  tender_customer_id: string | null;
  
  notes: string | null;
  
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================
// Документы
// ============================================
export type DocumentType = 'invoice' | 'act' | 'waybill' | 'upd' | 'contract' | 'invoice_factura';

export const DOCUMENT_TYPES: Record<DocumentType, { name: string; icon: string }> = {
  invoice: { name: 'Счёт на оплату', icon: 'receipt' },
  act: { name: 'Акт выполненных работ', icon: 'description' },
  waybill: { name: 'Товарная накладная (ТОРГ-12)', icon: 'local_shipping' },
  upd: { name: 'УПД', icon: 'article' },
  contract: { name: 'Договор', icon: 'handshake' },
  invoice_factura: { name: 'Счёт-фактура', icon: 'receipt_long' },
};

export type DocumentStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

export const DOCUMENT_STATUSES: Record<DocumentStatus, { name: string; color: string }> = {
  draft: { name: 'Черновик', color: '#9e9e9e' },
  issued: { name: 'Выставлен', color: '#2196f3' },
  paid: { name: 'Оплачен', color: '#4caf50' },
  cancelled: { name: 'Отменён', color: '#f44336' },
};

export interface AccountingDocument {
  id: string;
  company_id: string;
  created_by: string;
  
  document_type: DocumentType;
  document_number: string;
  document_date: string;
  
  tender_id: string | null;
  
  counterparty_id: string | null;
  counterparty_name: string;
  counterparty_inn: string | null;
  counterparty_kpp: string | null;
  counterparty_address: string | null;
  
  // Суммы в копейках
  subtotal: number;
  vat_amount: number;
  total: number;
  
  vat_rate: number | null;
  
  contract_start_date: string | null;
  contract_end_date: string | null;
  
  status: DocumentStatus;
  paid_at: string | null;
  paid_amount: number;
  
  notes: string | null;
  metadata: Record<string, unknown>;
  
  pdf_path: string | null;
  
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Joined
  items?: AccountingDocumentItem[];
  counterparty?: AccountingCounterparty;
  tender?: { id: string; purchase_number: string; subject: string };
  creator?: { id: string; full_name: string };
}

export interface AccountingDocumentItem {
  id: string;
  document_id: string;
  
  position: number;
  
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  
  // Цены в копейках
  price_per_unit: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  
  created_at: string;
}

// ============================================
// КУДиР
// ============================================
export interface KudirEntry {
  id: string;
  company_id: string;
  
  entry_number: number;
  entry_date: string;
  
  document_id: string | null;
  tender_id: string | null;
  
  primary_document_type: string | null;
  primary_document_number: string | null;
  primary_document_date: string | null;
  
  description: string;
  
  // Суммы в копейках
  income: number;
  expense: number;
  deductible_expense: number;
  
  is_manual: boolean;
  metadata: Record<string, unknown>;
  
  created_at: string;
  updated_at: string;
  
  // Joined
  document?: AccountingDocument;
  tender?: { id: string; purchase_number: string; subject: string };
}

// ============================================
// Налоговые платежи
// ============================================
export type TaxType = 'usn' | 'vat' | 'income_tax' | 'property_tax' | 'insurance_fixed' | 'insurance_additional';

export const TAX_TYPES: Record<TaxType, string> = {
  usn: 'УСН',
  vat: 'НДС',
  income_tax: 'Налог на прибыль',
  property_tax: 'Налог на имущество',
  insurance_fixed: 'Страховые взносы (фиксированные)',
  insurance_additional: 'Страховые взносы (1% свыше 300 000)',
};

export type TaxPaymentStatus = 'pending' | 'paid' | 'overdue' | 'partial';

export const TAX_PAYMENT_STATUSES: Record<TaxPaymentStatus, { name: string; color: string }> = {
  pending: { name: 'Ожидает оплаты', color: '#ff9800' },
  paid: { name: 'Оплачен', color: '#4caf50' },
  overdue: { name: 'Просрочен', color: '#f44336' },
  partial: { name: 'Частично оплачен', color: '#2196f3' },
};

export interface TaxPayment {
  id: string;
  company_id: string;
  
  tax_type: TaxType;
  tax_name: string;
  
  period_year: number;
  period_quarter: number | null;
  period_month: number | null;
  
  // Суммы в копейках
  calculated_amount: number;
  paid_amount: number;
  
  due_date: string;
  paid_at: string | null;
  
  status: TaxPaymentStatus;
  
  calculation_details: Record<string, unknown>;
  
  notes: string | null;
  
  created_at: string;
  updated_at: string;
}

// ============================================
// События налогового календаря
// ============================================
export type TaxEventType = 'payment' | 'report' | 'deadline';

export interface TaxCalendarEvent {
  id: string;
  company_id: string;
  
  event_type: TaxEventType;
  title: string;
  description: string | null;
  
  event_date: string;
  
  tax_payment_id: string | null;
  
  reminder_days: number;
  reminder_sent: boolean;
  
  is_completed: boolean;
  completed_at: string | null;
  
  created_at: string;
  
  // Joined
  tax_payment?: TaxPayment;
}

// ============================================
// DTOs для создания/обновления
// ============================================
export interface CreateAccountingSettingsInput {
  company_id: string;
  organization_type?: OrganizationType;
  full_name: string;
  inn: string;
  tax_system?: TaxSystem;
  vat_payer?: boolean;
}

export interface UpdateAccountingSettingsInput {
  organization_type?: OrganizationType;
  full_name?: string;
  short_name?: string | null;
  inn?: string;
  kpp?: string | null;
  ogrn?: string | null;
  okpo?: string | null;
  okved?: string | null;
  legal_address?: string | null;
  actual_address?: string | null;
  bank_name?: string | null;
  bank_bik?: string | null;
  bank_account?: string | null;
  bank_corr_account?: string | null;
  director_name?: string | null;
  director_position?: string;
  accountant_name?: string | null;
  tax_system?: TaxSystem;
  vat_payer?: boolean;
  vat_rate?: VatRate;
  usn_rate?: number;
  usn_min_tax_rate?: number;
  invoice_prefix?: string;
  act_prefix?: string;
  waybill_prefix?: string;
  upd_prefix?: string;
  contract_prefix?: string;
}

export interface CreateCounterpartyInput {
  company_id: string;
  name: string;
  short_name?: string;
  organization_type?: OrganizationType;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legal_address?: string;
  actual_address?: string;
  bank_name?: string;
  bank_bik?: string;
  bank_account?: string;
  bank_corr_account?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  is_customer?: boolean;
  is_supplier?: boolean;
  tender_customer_id?: string;
  notes?: string;
}

export interface CreateDocumentInput {
  company_id: string;
  document_type: DocumentType;
  document_date: string;
  tender_id?: string;
  counterparty_id?: string;
  counterparty_name: string;
  counterparty_inn?: string;
  counterparty_kpp?: string;
  counterparty_address?: string;
  vat_rate?: number;
  notes?: string;
  items: CreateDocumentItemInput[];
}

export interface CreateDocumentItemInput {
  name: string;
  description?: string;
  unit?: string;
  quantity: number;
  price_per_unit: number; // в копейках
  vat_rate?: number;
}

export interface CreateKudirEntryInput {
  company_id: string;
  entry_date: string;
  document_id?: string;
  tender_id?: string;
  primary_document_type?: string;
  primary_document_number?: string;
  primary_document_date?: string;
  description: string;
  income?: number;
  expense?: number;
  deductible_expense?: number;
  is_manual?: boolean;
}

// ============================================
// Утилиты
// ============================================

/**
 * Форматирует сумму в копейках в рубли
 */
export function formatMoney(kopecks: number, currency: string = 'RUB'): string {
  const rubles = kopecks / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rubles);
}

/**
 * Конвертирует рубли в копейки
 */
export function rublesToKopecks(rubles: number): number {
  return Math.round(rubles * 100);
}

/**
 * Конвертирует копейки в рубли
 */
export function kopecksToRubles(kopecks: number): number {
  return kopecks / 100;
}

/**
 * Рассчитывает НДС от суммы без НДС
 */
export function calculateVat(amountWithoutVat: number, vatRate: VatRate): number {
  return Math.round(amountWithoutVat * vatRate / 100);
}

/**
 * Выделяет НДС из суммы с НДС
 */
export function extractVat(amountWithVat: number, vatRate: VatRate): number {
  if (vatRate === 0) return 0;
  return Math.round(amountWithVat * vatRate / (100 + vatRate));
}

/**
 * Форматирует дату в русском формате
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Форматирует номер документа с префиксом
 */
export function formatDocumentNumber(prefix: string, number: number): string {
  return `${prefix}-${String(number).padStart(5, '0')}`;
}

/**
 * Получает название квартала
 */
export function getQuarterName(quarter: number): string {
  const quarters: Record<number, string> = {
    1: 'I квартал',
    2: 'II квартал',
    3: 'III квартал',
    4: 'IV квартал',
  };
  return quarters[quarter] || '';
}

/**
 * Получает название месяца
 */
export function getMonthName(month: number): string {
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  return months[month - 1] || '';
}

// ============================================
// Константы для налогов 2024
// ============================================
export const TAX_CONSTANTS = {
  // Фиксированные страховые взносы ИП на 2024
  IP_INSURANCE_FIXED_2024: 4950000, // 49 500 ₽ в копейках
  
  // Порог для доп. взноса 1%
  IP_INCOME_THRESHOLD: 30000000, // 300 000 ₽ в копейках
  
  // Максимальная база для доп. взносов
  IP_MAX_INSURANCE_BASE: 35410000, // 354 100 ₽ в копейках (максимум доп. взносов)
  
  // Ставки УСН по умолчанию
  USN_INCOME_RATE: 6,
  USN_INCOME_EXPENSE_RATE: 15,
  USN_MIN_TAX_RATE: 1,
  
  // Ставки НДС
  VAT_STANDARD_RATE: 20,
  VAT_REDUCED_RATE: 10,
  
  // Налог на прибыль
  PROFIT_TAX_RATE: 20,
};

// Сроки уплаты налогов
export const TAX_DUE_DATES = {
  // УСН авансовые платежи
  USN_Q1: { month: 4, day: 28 }, // до 28 апреля
  USN_Q2: { month: 7, day: 28 }, // до 28 июля
  USN_Q3: { month: 10, day: 28 }, // до 28 октября
  USN_YEAR_OOO: { month: 4, day: 28 }, // до 28 апреля (для ООО)
  USN_YEAR_IP: { month: 4, day: 28 }, // до 28 апреля (для ИП)
  
  // Страховые взносы ИП
  IP_INSURANCE_FIXED: { month: 12, day: 31 }, // до 31 декабря
  IP_INSURANCE_ADDITIONAL: { month: 7, day: 1 }, // до 1 июля следующего года
  
  // НДС (ежемесячно)
  VAT_MONTHLY: { day: 28 }, // до 28 числа
};
