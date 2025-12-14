// Типы для банковских интеграций

// Коды поддерживаемых банков
export type BankCode = 
  | 'sber'        // Сбербанк
  | 'tinkoff'     // Тинькофф
  | 'alfa'        // Альфа-Банк
  | 'vtb'         // ВТБ
  | 'raiffeisen'  // Райффайзен
  | 'modulbank'   // Модульбанк
  | 'tochka'      // Точка Банк
  | 'otkritie'    // Открытие
  | 'psb'         // ПСБ
  | 'other';      // Другой банк

// Информация о банках
export const BANKS: Record<BankCode, {
  name: string;
  shortName: string;
  hasApi: boolean;
  apiDocsUrl?: string;
  oauthSupported: boolean;
  logo?: string;
}> = {
  sber: {
    name: 'Сбербанк',
    shortName: 'Сбер',
    hasApi: true,
    apiDocsUrl: 'https://developer.sberbank.ru/',
    oauthSupported: true,
  },
  tinkoff: {
    name: 'Тинькофф Бизнес',
    shortName: 'Тинькофф',
    hasApi: true,
    apiDocsUrl: 'https://www.tinkoff.ru/business/open-api/',
    oauthSupported: true,
  },
  alfa: {
    name: 'Альфа-Банк',
    shortName: 'Альфа',
    hasApi: true,
    apiDocsUrl: 'https://developers.alfabank.ru/',
    oauthSupported: true,
  },
  vtb: {
    name: 'ВТБ',
    shortName: 'ВТБ',
    hasApi: true,
    apiDocsUrl: 'https://developer.vtb.ru/',
    oauthSupported: true,
  },
  raiffeisen: {
    name: 'Райффайзенбанк',
    shortName: 'Райффайзен',
    hasApi: true,
    apiDocsUrl: 'https://developers.raiffeisen.ru/',
    oauthSupported: true,
  },
  modulbank: {
    name: 'Модульбанк',
    shortName: 'Модуль',
    hasApi: true,
    apiDocsUrl: 'https://api.modulbank.ru/',
    oauthSupported: true,
  },
  tochka: {
    name: 'Точка Банк',
    shortName: 'Точка',
    hasApi: true,
    apiDocsUrl: 'https://enter.tochka.com/doc/v2/',
    oauthSupported: true,
  },
  otkritie: {
    name: 'Банк Открытие',
    shortName: 'Открытие',
    hasApi: true,
    apiDocsUrl: 'https://developers.open.ru/',
    oauthSupported: true,
  },
  psb: {
    name: 'Промсвязьбанк',
    shortName: 'ПСБ',
    hasApi: true,
    oauthSupported: false,
  },
  other: {
    name: 'Другой банк',
    shortName: 'Другой',
    hasApi: false,
    oauthSupported: false,
  },
};

// Типы счетов
export type AccountType = 'checking' | 'savings' | 'deposit' | 'card';

export const ACCOUNT_TYPES: Record<AccountType, string> = {
  checking: 'Расчётный',
  savings: 'Накопительный',
  deposit: 'Депозит',
  card: 'Карточный',
};

// Статусы счёта
export type AccountStatus = 'active' | 'blocked' | 'closed';

export const ACCOUNT_STATUSES: Record<AccountStatus, { name: string; color: string }> = {
  active: { name: 'Активен', color: '#22c55e' },
  blocked: { name: 'Заблокирован', color: '#ef4444' },
  closed: { name: 'Закрыт', color: '#6b7280' },
};

// Типы интеграции
export type IntegrationType = 'api' | '1c' | 'manual';

export const INTEGRATION_TYPES: Record<IntegrationType, string> = {
  api: 'API банка',
  '1c': 'Клиент-банк 1С',
  manual: 'Ручной ввод',
};

// Статусы интеграции
export type IntegrationStatus = 'pending' | 'active' | 'expired' | 'error' | 'disconnected';

export const INTEGRATION_STATUSES: Record<IntegrationStatus, { name: string; color: string }> = {
  pending: { name: 'Ожидает подключения', color: '#f59e0b' },
  active: { name: 'Активна', color: '#22c55e' },
  expired: { name: 'Токен истёк', color: '#ef4444' },
  error: { name: 'Ошибка', color: '#ef4444' },
  disconnected: { name: 'Отключена', color: '#6b7280' },
};

// Типы операций
export type OperationType = 'credit' | 'debit';

export const OPERATION_TYPES: Record<OperationType, { name: string; color: string }> = {
  credit: { name: 'Поступление', color: '#22c55e' },
  debit: { name: 'Списание', color: '#ef4444' },
};

// Статусы обработки транзакции
export type ProcessingStatus = 'new' | 'processed' | 'ignored' | 'error';

export const PROCESSING_STATUSES: Record<ProcessingStatus, { name: string; color: string }> = {
  new: { name: 'Новая', color: '#3b82f6' },
  processed: { name: 'Обработана', color: '#22c55e' },
  ignored: { name: 'Пропущена', color: '#6b7280' },
  error: { name: 'Ошибка', color: '#ef4444' },
};

// Статусы платёжного поручения
export type PaymentOrderStatus = 
  | 'draft' 
  | 'pending' 
  | 'sent' 
  | 'accepted' 
  | 'executed' 
  | 'rejected' 
  | 'cancelled';

export const PAYMENT_ORDER_STATUSES: Record<PaymentOrderStatus, { name: string; color: string }> = {
  draft: { name: 'Черновик', color: '#6b7280' },
  pending: { name: 'Ожидает отправки', color: '#f59e0b' },
  sent: { name: 'Отправлено в банк', color: '#3b82f6' },
  accepted: { name: 'Принято банком', color: '#8b5cf6' },
  executed: { name: 'Исполнено', color: '#22c55e' },
  rejected: { name: 'Отклонено', color: '#ef4444' },
  cancelled: { name: 'Отменено', color: '#6b7280' },
};

// Очерёдность платежа
export type PaymentOrderPriority = '1' | '2' | '3' | '4' | '5';

export const PAYMENT_ORDER_PRIORITIES: Record<PaymentOrderPriority, string> = {
  '1': 'Первая (исполнительные листы)',
  '2': 'Вторая (зарплата)',
  '3': 'Третья (налоги)',
  '4': 'Четвёртая (другие платежи)',
  '5': 'Пятая (текущие платежи)',
};

// ============================================
// Интерфейсы сущностей
// ============================================

// Расчётный счёт
export interface BankAccount {
  id: string;
  company_id: string;
  name: string;
  account_number: string;
  currency: string;
  bank_name: string;
  bank_bik: string;
  bank_corr_account: string | null;
  bank_swift: string | null;
  account_type: AccountType;
  balance: number;
  balance_updated_at: string | null;
  status: AccountStatus;
  is_primary: boolean;
  opened_at: string | null;
  closed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Банковская интеграция
export interface BankIntegration {
  id: string;
  company_id: string;
  bank_code: BankCode;
  bank_name: string;
  integration_type: IntegrationType;
  api_client_id: string | null;
  api_client_secret: string | null;
  api_access_token: string | null;
  api_refresh_token: string | null;
  api_token_expires_at: string | null;
  oauth_redirect_uri: string | null;
  oauth_state: string | null;
  is_sandbox: boolean;
  api_base_url: string | null;
  status: IntegrationStatus;
  last_sync_at: string | null;
  last_error: string | null;
  sync_enabled: boolean;
  sync_interval_minutes: number;
  sync_transactions: boolean;
  sync_statements: boolean;
  linked_account_ids: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Банковская транзакция
export interface BankTransaction {
  id: string;
  company_id: string;
  bank_account_id: string;
  integration_id: string | null;
  external_id: string | null;
  transaction_date: string;
  transaction_time: string | null;
  operation_type: OperationType;
  amount: number;
  fee: number;
  balance_after: number | null;
  counterparty_name: string | null;
  counterparty_inn: string | null;
  counterparty_kpp: string | null;
  counterparty_account: string | null;
  counterparty_bank_name: string | null;
  counterparty_bank_bik: string | null;
  purpose: string | null;
  category: string | null;
  accounting_document_id: string | null;
  kudir_entry_id: string | null;
  processing_status: ProcessingStatus;
  raw_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Платёжное поручение
export interface PaymentOrder {
  id: string;
  company_id: string;
  bank_account_id: string;
  created_by: string;
  order_number: string;
  order_date: string;
  amount: number;
  recipient_name: string;
  recipient_inn: string | null;
  recipient_kpp: string | null;
  recipient_account: string;
  recipient_bank_name: string;
  recipient_bank_bik: string;
  recipient_bank_corr_account: string | null;
  purpose: string;
  priority: number;
  vat_type: 'none' | 'included' | 'excluded';
  vat_amount: number;
  accounting_document_id: string | null;
  status: PaymentOrderStatus;
  bank_status: string | null;
  bank_response: Record<string, unknown>;
  executed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Лог синхронизации
export interface BankSyncLog {
  id: string;
  company_id: string;
  integration_id: string;
  operation_type: string;
  status: 'started' | 'success' | 'error';
  started_at: string;
  finished_at: string | null;
  records_processed: number;
  records_created: number;
  records_updated: number;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  request_data: Record<string, unknown> | null;
  response_data: Record<string, unknown> | null;
}

// ============================================
// DTO для создания/обновления
// ============================================

export interface CreateBankAccountDTO {
  name: string;
  account_number: string;
  currency?: string;
  bank_name: string;
  bank_bik: string;
  bank_corr_account?: string;
  bank_swift?: string;
  account_type?: string;
  is_primary?: boolean;
  opened_at?: string;
}

export interface UpdateBankAccountDTO {
  name?: string;
  bank_corr_account?: string;
  bank_swift?: string;
  status?: AccountStatus;
  is_primary?: boolean;
  closed_at?: string;
}

export interface CreateBankIntegrationDTO {
  bank_code: BankCode;
  bank_name: string;
  integration_type?: IntegrationType;
  is_sandbox?: boolean;
  api_base_url?: string;
}

export interface UpdateBankIntegrationDTO {
  api_client_id?: string;
  api_client_secret?: string;
  api_access_token?: string;
  api_refresh_token?: string;
  api_token_expires_at?: string;
  status?: IntegrationStatus;
  last_sync_at?: string;
  last_error?: string | null;
  sync_enabled?: boolean;
  sync_interval_minutes?: number;
  sync_transactions?: boolean;
  sync_statements?: boolean;
  linked_account_ids?: string[];
}

export interface CreatePaymentOrderDTO {
  bank_account_id: string;
  order_number: string;
  order_date: string;
  amount: number;
  recipient_name: string;
  recipient_inn?: string;
  recipient_kpp?: string;
  recipient_account: string;
  recipient_bank_name: string;
  recipient_bank_bik: string;
  recipient_bank_corr_account?: string;
  purpose: string;
  priority?: number;
  vat_type?: 'none' | 'included' | 'excluded';
  vat_amount?: number;
  accounting_document_id?: string;
}

// ============================================
// Утилиты
// ============================================

// Форматирование номера счёта (40702810XXXXXXXXXX -> 40702 810 X XXXX XXXX XXXX)
export function formatAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length !== 20) return accountNumber;
  return `${accountNumber.slice(0, 5)} ${accountNumber.slice(5, 8)} ${accountNumber.slice(8, 9)} ${accountNumber.slice(9, 13)} ${accountNumber.slice(13, 17)} ${accountNumber.slice(17)}`;
}

// Маскирование номера счёта (40702810123456789012 -> ****9012)
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return accountNumber;
  return `****${accountNumber.slice(-4)}`;
}

// Форматирование БИК
export function formatBik(bik: string): string {
  return bik;
}

// Получение региона по БИК
export function getRegionByBik(bik: string): string {
  if (!bik || bik.length !== 9) return '';
  const regionCode = bik.slice(0, 2);
  const regions: Record<string, string> = {
    '04': 'Москва и МО',
    '07': 'Санкт-Петербург',
    '01': 'Республика Адыгея',
    '02': 'Республика Башкортостан',
    // ... можно добавить остальные регионы
  };
  return regions[regionCode] || '';
}

// Валидация номера счёта
export function validateAccountNumber(accountNumber: string): boolean {
  if (!accountNumber) return false;
  // Российский расчётный счёт = 20 цифр
  return /^\d{20}$/.test(accountNumber);
}

// Валидация БИК
export function validateBik(bik: string): boolean {
  if (!bik) return false;
  // БИК = 9 цифр
  return /^\d{9}$/.test(bik);
}

// Валидация корр. счёта
export function validateCorrAccount(corrAccount: string): boolean {
  if (!corrAccount) return false;
  // Корр. счёт = 20 цифр, начинается с 301
  return /^301\d{17}$/.test(corrAccount);
}
