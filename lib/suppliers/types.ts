// =====================================================
// Модуль "Поставщики" - TypeScript типы
// =====================================================

// =====================================================
// Статусы и константы
// =====================================================

export type SupplierStatus = "active" | "inactive" | "blacklisted";

export const SUPPLIER_STATUSES: Record<SupplierStatus, { name: string; color: string }> = {
  active: { name: "Активный", color: "green" },
  inactive: { name: "Неактивный", color: "gray" },
  blacklisted: { name: "Чёрный список", color: "red" },
};

export type SupplierFileType = 
  | "commercial_offer" 
  | "invoice" 
  | "contract" 
  | "price_list" 
  | "certificate" 
  | "license" 
  | "other";

export const SUPPLIER_FILE_TYPES: Record<SupplierFileType, { name: string; icon: string }> = {
  commercial_offer: { name: "Коммерческое предложение", icon: "FileText" },
  invoice: { name: "Счёт", icon: "Receipt" },
  contract: { name: "Договор", icon: "FileSignature" },
  price_list: { name: "Прайс-лист", icon: "List" },
  certificate: { name: "Сертификат", icon: "Award" },
  license: { name: "Лицензия", icon: "Shield" },
  other: { name: "Прочее", icon: "File" },
};

export type SupplierTenderRole = "participant" | "winner" | "subcontractor" | "partner";

export const SUPPLIER_TENDER_ROLES: Record<SupplierTenderRole, { name: string; color: string }> = {
  participant: { name: "Участник", color: "blue" },
  winner: { name: "Победитель", color: "green" },
  subcontractor: { name: "Субподрядчик", color: "purple" },
  partner: { name: "Партнёр", color: "orange" },
};

export type SupplierTenderStatus = 
  | "invited" 
  | "confirmed" 
  | "submitted" 
  | "rejected" 
  | "won" 
  | "lost";

export const SUPPLIER_TENDER_STATUSES: Record<SupplierTenderStatus, { name: string; color: string }> = {
  invited: { name: "Приглашён", color: "blue" },
  confirmed: { name: "Подтвердил", color: "cyan" },
  submitted: { name: "Подал заявку", color: "purple" },
  rejected: { name: "Отказался", color: "gray" },
  won: { name: "Победил", color: "green" },
  lost: { name: "Проиграл", color: "red" },
};

export type CallDirection = "inbound" | "outbound";

export const CALL_DIRECTIONS: Record<CallDirection, { name: string; icon: string }> = {
  inbound: { name: "Входящий", icon: "PhoneIncoming" },
  outbound: { name: "Исходящий", icon: "PhoneOutgoing" },
};

export type CallStatus = 
  | "ringing" 
  | "answered" 
  | "completed" 
  | "missed" 
  | "busy" 
  | "failed" 
  | "cancelled";

export const CALL_STATUSES: Record<CallStatus, { name: string; color: string }> = {
  ringing: { name: "Звонит", color: "blue" },
  answered: { name: "Отвечен", color: "green" },
  completed: { name: "Завершён", color: "green" },
  missed: { name: "Пропущен", color: "red" },
  busy: { name: "Занято", color: "orange" },
  failed: { name: "Ошибка", color: "red" },
  cancelled: { name: "Отменён", color: "gray" },
};

// =====================================================
// Интерфейсы
// =====================================================

export interface SupplierCategory {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  parent_id?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  company_id: string;
  user_id: string;
  
  // Основная информация
  name: string;
  short_name?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  
  // Адреса
  legal_address?: string;
  actual_address?: string;
  
  // Контакты
  phone?: string;
  email?: string;
  website?: string;
  
  // Классификация
  category_id?: string;
  category?: SupplierCategory;
  status: SupplierStatus;
  rating?: number;
  tags: string[];
  
  // Связь с бухгалтерией
  counterparty_id?: string;
  
  // Описание
  description?: string;
  
  // Метаданные
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Связанные данные (для запросов с join)
  contacts?: SupplierContact[];
  notes_count?: number;
  files_count?: number;
  tenders_count?: number;
  calls_count?: number;
}

export interface SupplierContact {
  id: string;
  supplier_id: string;
  
  name: string;
  position?: string;
  department?: string;
  
  phone?: string;
  phone_mobile?: string;
  phone_internal?: string;
  email?: string;
  telegram?: string;
  
  is_primary: boolean;
  is_decision_maker: boolean;
  notes?: string;
  
  created_at: string;
  updated_at: string;
}

export interface SupplierNote {
  id: string;
  supplier_id: string;
  user_id: string;
  
  title?: string;
  content: string;
  is_pinned: boolean;
  
  created_at: string;
  updated_at: string;
  
  // Для отображения
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface SupplierFile {
  id: string;
  supplier_id: string;
  user_id: string;
  
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  
  file_type: SupplierFileType;
  description?: string;
  tender_id?: string;
  
  created_at: string;
  
  // Для отображения
  tender?: {
    id: string;
    purchase_number: string;
    subject: string;
  };
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface SupplierTender {
  id: string;
  supplier_id: string;
  tender_id: string;
  
  role: SupplierTenderRole;
  status: SupplierTenderStatus;
  
  proposed_price?: number;
  final_price?: number;
  notes?: string;
  
  invited_at: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
  
  // Для отображения
  tender?: {
    id: string;
    purchase_number: string;
    subject: string;
    status: string;
    max_price?: number;
  };
}

export interface MangoSettings {
  id: string;
  company_id: string;
  
  api_key: string;
  api_salt: string;
  
  is_enabled: boolean;
  record_calls: boolean;
  
  extension_mapping: Record<string, string>; // user_id -> extension
  
  webhook_url?: string;
  webhook_secret?: string;
  
  created_at: string;
  updated_at: string;
}

export interface CallHistory {
  id: string;
  company_id: string;
  user_id?: string;
  
  supplier_id?: string;
  contact_id?: string;
  
  mango_call_id?: string;
  mango_entry_id?: string;
  direction: CallDirection;
  
  from_number?: string;
  to_number?: string;
  extension?: string;
  
  started_at: string;
  answered_at?: string;
  ended_at?: string;
  
  duration: number;
  talk_duration: number;
  
  status: CallStatus;
  
  recording_url?: string;
  recording_id?: string;
  notes?: string;
  
  created_at: string;
  
  // Для отображения
  supplier?: {
    id: string;
    name: string;
    short_name?: string;
  };
  contact?: {
    id: string;
    name: string;
    position?: string;
  };
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

// =====================================================
// DTO для создания/обновления
// =====================================================

export interface CreateSupplierInput {
  company_id: string;
  user_id: string;
  name: string;
  short_name?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legal_address?: string;
  actual_address?: string;
  phone?: string;
  email?: string;
  website?: string;
  category_id?: string;
  status?: SupplierStatus;
  rating?: number;
  tags?: string[];
  description?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  short_name?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legal_address?: string;
  actual_address?: string;
  phone?: string;
  email?: string;
  website?: string;
  category_id?: string;
  status?: SupplierStatus;
  rating?: number;
  tags?: string[];
  counterparty_id?: string;
  description?: string;
}

export interface CreateSupplierContactInput {
  supplier_id: string;
  name: string;
  position?: string;
  department?: string;
  phone?: string;
  phone_mobile?: string;
  phone_internal?: string;
  email?: string;
  telegram?: string;
  is_primary?: boolean;
  is_decision_maker?: boolean;
  notes?: string;
}

export interface UpdateSupplierContactInput {
  name?: string;
  position?: string;
  department?: string;
  phone?: string;
  phone_mobile?: string;
  phone_internal?: string;
  email?: string;
  telegram?: string;
  is_primary?: boolean;
  is_decision_maker?: boolean;
  notes?: string;
}

export interface CreateSupplierNoteInput {
  supplier_id: string;
  user_id: string;
  title?: string;
  content: string;
  is_pinned?: boolean;
}

export interface CreateSupplierFileInput {
  supplier_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  file_type?: SupplierFileType;
  description?: string;
  tender_id?: string;
}

export interface CreateSupplierTenderInput {
  supplier_id: string;
  tender_id: string;
  role?: SupplierTenderRole;
  status?: SupplierTenderStatus;
  proposed_price?: number;
  notes?: string;
}

export interface CreateCallHistoryInput {
  company_id: string;
  user_id?: string;
  supplier_id?: string;
  contact_id?: string;
  mango_call_id?: string;
  mango_entry_id?: string;
  direction: CallDirection;
  from_number?: string;
  to_number?: string;
  extension?: string;
  started_at: string;
  status: CallStatus;
}

export interface UpdateCallHistoryInput {
  supplier_id?: string;
  contact_id?: string;
  answered_at?: string;
  ended_at?: string;
  duration?: number;
  talk_duration?: number;
  status?: CallStatus;
  recording_url?: string;
  recording_id?: string;
  notes?: string;
}

export interface SaveMangoSettingsInput {
  company_id: string;
  api_key: string;
  api_salt: string;
  is_enabled?: boolean;
  record_calls?: boolean;
  extension_mapping?: Record<string, string>;
}

// =====================================================
// Mango Office API типы
// =====================================================

export interface MangoCallbackRequest {
  command_id: string;
  from: {
    extension: string;
    number?: string;
  };
  to_number: string;
  line_number?: string;
}

export interface MangoCallbackResponse {
  result: number;
  call_id?: string;
}

export interface MangoWebhookEvent {
  entry_id: string;
  call_id: string;
  timestamp: number;
  seq: number;
  
  call_state: "Appeared" | "Connected" | "Disconnected";
  location: "ivr" | "queue" | "abonent";
  
  from: {
    number: string;
    extension?: string;
    taken_from_call_id?: string;
  };
  to: {
    number: string;
    extension?: string;
    line_number?: string;
  };
  
  dct?: {
    type: number;
    name?: string;
  };
  
  disconnect_reason?: number;
  talk_time?: number;
  create_time?: number;
  fwd_time?: number;
  answer_time?: number;
  end_time?: number;
}

export interface MangoRecordingRequest {
  recording_id: string;
  action: "download" | "play";
}

// =====================================================
// Фильтры и параметры
// =====================================================

export interface SuppliersFilter {
  search?: string;
  category_id?: string;
  status?: SupplierStatus;
  rating?: number;
  tags?: string[];
  has_tenders?: boolean;
}

export interface CallHistoryFilter {
  supplier_id?: string;
  direction?: CallDirection;
  status?: CallStatus;
  date_from?: string;
  date_to?: string;
}

// =====================================================
// Утилиты
// =====================================================

export function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return "";
  
  // Убираем все кроме цифр
  const digits = phone.replace(/\D/g, "");
  
  // Форматируем для России
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  
  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
  }
  
  return phone;
}

export function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return "";
  
  // Убираем все кроме цифр
  const digits = phone.replace(/\D/g, "");
  
  // Нормализуем для России
  if (digits.length === 11 && digits.startsWith("8")) {
    return "7" + digits.slice(1);
  }
  
  if (digits.length === 10) {
    return "7" + digits;
  }
  
  return digits;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} сек`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  if (minutes < 60) {
    return secs > 0 ? `${minutes} мин ${secs} сек` : `${minutes} мин`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours} ч ${mins} мин`;
}

export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes) return "0 B";
  
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// =====================================================
// Задачи (Tasks)
// =====================================================

export type TaskType = "call" | "meeting" | "email" | "contract" | "payment" | "delivery" | "other";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export const TASK_TYPES: Record<TaskType, { name: string; icon: string }> = {
  call: { name: "Позвонить", icon: "Phone" },
  meeting: { name: "Встреча", icon: "Users" },
  email: { name: "Написать письмо", icon: "Mail" },
  contract: { name: "По договору", icon: "FileText" },
  payment: { name: "По оплате", icon: "CreditCard" },
  delivery: { name: "По доставке", icon: "Truck" },
  other: { name: "Другое", icon: "MoreHorizontal" },
};

export const TASK_PRIORITIES: Record<TaskPriority, { name: string; color: string }> = {
  low: { name: "Низкий", color: "gray" },
  medium: { name: "Средний", color: "blue" },
  high: { name: "Высокий", color: "orange" },
  urgent: { name: "Срочно", color: "red" },
};

export const TASK_STATUSES: Record<TaskStatus, { name: string; color: string }> = {
  pending: { name: "Ожидает", color: "gray" },
  in_progress: { name: "В работе", color: "blue" },
  completed: { name: "Выполнена", color: "green" },
  cancelled: { name: "Отменена", color: "red" },
};

export interface SupplierTask {
  id: string;
  company_id: string;
  supplier_id: string;
  title: string;
  description?: string;
  task_type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  reminder_date?: string;
  completed_at?: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  supplier?: { id: string; name: string };
  assignee?: { id: string; email: string };
  creator?: { id: string; email: string };
}

export interface CreateTaskInput {
  supplier_id: string;
  title: string;
  description?: string;
  task_type?: TaskType;
  priority?: TaskPriority;
  due_date?: string;
  reminder_date?: string;
  assigned_to?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  task_type?: TaskType;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string;
  reminder_date?: string;
  assigned_to?: string;
}

// =====================================================
// История взаимодействий (Activity Log)
// =====================================================

export type ActivityType =
  | "created" | "updated" | "call_made" | "call_received"
  | "email_sent" | "email_received" | "meeting" | "note_added"
  | "file_uploaded" | "contract_signed" | "task_created"
  | "task_completed" | "status_changed" | "rating_changed" | "comment";

export const ACTIVITY_TYPES: Record<ActivityType, { name: string; icon: string; color: string }> = {
  created: { name: "Создан", icon: "Plus", color: "green" },
  updated: { name: "Обновлён", icon: "Edit", color: "blue" },
  call_made: { name: "Исходящий звонок", icon: "PhoneOutgoing", color: "blue" },
  call_received: { name: "Входящий звонок", icon: "PhoneIncoming", color: "green" },
  email_sent: { name: "Отправлено письмо", icon: "Send", color: "blue" },
  email_received: { name: "Получено письмо", icon: "Mail", color: "green" },
  meeting: { name: "Встреча", icon: "Users", color: "purple" },
  note_added: { name: "Заметка", icon: "StickyNote", color: "yellow" },
  file_uploaded: { name: "Загружен файл", icon: "Upload", color: "gray" },
  contract_signed: { name: "Подписан договор", icon: "FileCheck", color: "green" },
  task_created: { name: "Создана задача", icon: "ListTodo", color: "blue" },
  task_completed: { name: "Задача выполнена", icon: "CheckCircle", color: "green" },
  status_changed: { name: "Изменён статус", icon: "RefreshCw", color: "orange" },
  rating_changed: { name: "Изменён рейтинг", icon: "Star", color: "yellow" },
  comment: { name: "Комментарий", icon: "MessageSquare", color: "gray" },
};

export interface SupplierActivity {
  id: string;
  company_id: string;
  supplier_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  related_task_id?: string;
  related_contact_id?: string;
  related_file_id?: string;
  user_id: string;
  created_at: string;
  user?: { id: string; email: string };
}

// =====================================================
// Договоры (Contracts)
// =====================================================

export type ContractType = "supply" | "service" | "framework" | "nda" | "other";
export type ContractStatus = "draft" | "pending" | "active" | "expired" | "terminated";
export type PaymentTerms = "prepayment" | "prepayment_50" | "postpayment" | "deferred_7" | "deferred_14" | "deferred_30" | "deferred_45" | "deferred_60" | "custom";

export const CONTRACT_TYPES: Record<ContractType, string> = {
  supply: "Поставки",
  service: "Услуги",
  framework: "Рамочный",
  nda: "NDA",
  other: "Другое",
};

export const CONTRACT_STATUSES: Record<ContractStatus, { name: string; color: string }> = {
  draft: { name: "Черновик", color: "gray" },
  pending: { name: "На согласовании", color: "yellow" },
  active: { name: "Действует", color: "green" },
  expired: { name: "Истёк", color: "red" },
  terminated: { name: "Расторгнут", color: "red" },
};

export const PAYMENT_TERMS: Record<PaymentTerms, string> = {
  prepayment: "Предоплата 100%",
  prepayment_50: "Предоплата 50%",
  postpayment: "Постоплата",
  deferred_7: "Отсрочка 7 дней",
  deferred_14: "Отсрочка 14 дней",
  deferred_30: "Отсрочка 30 дней",
  deferred_45: "Отсрочка 45 дней",
  deferred_60: "Отсрочка 60 дней",
  custom: "Другое",
};

export interface SupplierContract {
  id: string;
  company_id: string;
  supplier_id: string;
  contract_number: string;
  title: string;
  description?: string;
  contract_type: ContractType;
  status: ContractStatus;
  start_date?: string;
  end_date?: string;
  signed_date?: string;
  payment_terms?: PaymentTerms;
  payment_terms_custom?: string;
  amount?: number;
  currency: string;
  file_path?: string;
  file_name?: string;
  reminder_days: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  supplier?: { id: string; name: string };
}

export interface CreateContractInput {
  supplier_id: string;
  contract_number: string;
  title: string;
  description?: string;
  contract_type?: ContractType;
  start_date?: string;
  end_date?: string;
  signed_date?: string;
  payment_terms?: PaymentTerms;
  payment_terms_custom?: string;
  amount?: number;
  currency?: string;
  reminder_days?: number;
}

// =====================================================
// Отзывы (Reviews)
// =====================================================

export interface SupplierReview {
  id: string;
  company_id: string;
  supplier_id: string;
  quality_rating?: number;
  delivery_rating?: number;
  price_rating?: number;
  communication_rating?: number;
  overall_rating?: number;
  comment?: string;
  related_tender_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  user?: { id: string; email: string };
}

export interface CreateReviewInput {
  supplier_id: string;
  quality_rating?: number;
  delivery_rating?: number;
  price_rating?: number;
  communication_rating?: number;
  overall_rating?: number;
  comment?: string;
  related_tender_id?: string;
}

// =====================================================
// Прайс-листы (Pricelists)
// =====================================================

export interface SupplierPricelist {
  id: string;
  company_id: string;
  supplier_id: string;
  title: string;
  description?: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}
