// Типы для системы тендеров (по аналогу CRM-конкурента)

export interface ProcurementMethod {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenderType {
  id: string;
  company_id: string | null; // null для системных типов
  name: string;
  description: string | null;
  is_system: boolean; // Системный тип (нельзя удалить)
  procurement_methods?: string[]; // Список доступных способов определения поставщика (deprecated)
  methods?: ProcurementMethod[]; // Связанные методы закупок
  created_at: string;
  updated_at: string;
}

export type TenderStageCategory = 'tender_dept' | 'realization' | 'archive';

export interface TenderStage {
  id: string;
  company_id: string | null; // null для системных этапов
  name: string;
  category: TenderStageCategory;
  order_index: number;
  color: string | null;
  is_final: boolean;
  is_system: boolean; // Системный этап (нельзя удалить/редактировать)
  is_hidden: boolean; // Скрытый этап (не отображается)
  created_at: string;
  updated_at: string;
}

// Шаблоны наборов этапов (например "ЗМО", "ФЗ-44")
export interface TenderStageTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  icon: string;
  is_active: boolean;
  is_system: boolean; // Системный шаблон (нельзя удалить/переименовать)
  created_at: string;
  updated_at: string;
  items?: TenderStageTemplateItem[];
}

export interface TenderStageTemplateItem {
  id: string;
  template_id: string;
  stage_id: string;
  order_index: number;
  created_at: string;
  stage?: TenderStage;
}

export type TenderStatus = 'active' | 'won' | 'lost' | 'archived';

export interface Tender {
  id: string;
  company_id: string;
  created_by: string;

  // Основная информация
  purchase_number: string;
  project_name: string | null;
  subject: string;
  method: string | null; // способ определения (аукцион, конкурс и т.д.)
  procurement_method: string | null; // способ определения (дубликат для совместимости)
  type_id: string | null;
  template_id: string | null; // шаблон этапов (ФЗ-44, ЗМО и т.д.)
  customer: string;
  city: string | null;
  platform: string | null; // электронная площадка (текст для совместимости)
  platform_id: string | null; // ID площадки из справочника
  eis_url: string | null; // ссылка на ЕИС
  currency: string; // валюта (RUB, USD, EUR)

  // Финансы (в копейках)
  nmck: number; // начальная максимальная цена контракта
  our_price: number | null;
  contract_price: number | null;
  application_security: number | null; // обеспечение заявки
  contract_security: number | null; // обеспечение контракта

  // Просчёт тендера
  purchase_cost: number | null; // закупка
  logistics_cost: number | null; // логистика
  bid_price: number | null; // цена для торгов
  other_costs: number | null; // прочие затраты
  planned_profit: number | null; // планируемая прибыль

  // Даты
  submission_deadline: string;
  auction_date: string | null;
  results_date: string | null;
  review_date: string | null;

  // Риски
  delivery_days_tz: number | null; // срок поставки по ТЗ (дней)
  delivery_days_actual: number | null; // фактические сроки поставки (дней)
  delivery_location: string | null; // место поставки
  delivery_locations_count: number | null; // количество мест поставки
  installation_required: boolean | null; // монтаж
  unloading_required: boolean | null; // разгрузка
  penalties: string | null; // штрафы
  customer_check: string | null; // проверка заказчика
  supplier_check: string | null; // проверка поставщика

  // Обратить внимание
  is_defense_order: boolean | null; // гособорон заказ
  national_regime: string | null; // нац. режим
  delivery_condition: string | null; // условие поставки
  long_warranty: string | null; // длительная гарантия
  payment_term: string | null; // срок оплаты
  acceptance_term: string | null; // срок приемки
  contract_duration: string | null; // срок действия контракта
  clarification_requests: string | null; // запросы на разъяснения
  other_notes: string | null; // другое

  // Результат
  legal_entity_id: string | null; // юр. лицо
  show_to_investors: boolean; // показать тендер инвесторам

  // Ответственные
  manager_id: string | null; // менеджер
  specialist_id: string | null; // тендерный специалист
  investor_id: string | null; // инвестор
  executor_id: string | null; // ответственный за реализацию

  // Статус и этап
  stage_id: string;
  status: TenderStatus;

  // Метаданные
  comment: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown>;

  // Информация о победителе (для этапа "Проиграли")
  winner_inn: string | null;
  winner_name: string | null;
  winner_price: number | null; // в копейках

  // Временные метки
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Joined data (опционально при запросах с JOIN)
  stage?: TenderStage;
  type?: TenderType;
  comments_count?: number; // Количество комментариев
  manager?: UserProfile;
  specialist?: UserProfile;
  investor?: UserProfile;
  executor?: UserProfile;
  creator?: UserProfile;
  responsible?: Array<{ employee: UserProfile }>; // Множественные ответственные из tender_responsible
  last_comment?: { content: string; created_at: string };
  next_task?: { title: string; due_date: string };
}

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  email?: string;
  role?: string;
}

export interface TenderStageHistory {
  id: string;
  tender_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  changed_by: string;
  comment: string | null;
  created_at: string;

  // Joined data
  from_stage?: TenderStage;
  to_stage?: TenderStage;
  changed_by_user?: UserProfile;
}

export interface TenderFieldHistory {
  id: string;
  tender_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string;
  created_at: string;

  // Joined data
  changed_by_user?: UserProfile;
}

export interface TenderTask {
  id: string;
  tender_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
}

export type AttachmentDocumentType =
  | 'application' // заявка
  | 'contract' // договор
  | 'protocol' // протокол
  | 'specification' // спецификация
  | 'other';

export interface TenderAttachment {
  id: string;
  tender_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: AttachmentDocumentType | null;
  metadata: Record<string, unknown>;
  created_at: string;
  deleted_at: string | null;

  // Joined data
  uploader?: UserProfile;
}

export interface TenderComment {
  id: string;
  tender_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  mentions: string[] | null; // массив user_id
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Joined data
  author?: UserProfile;
  replies?: TenderComment[];
  mentioned_users?: UserProfile[];
}

// DTOs для создания/обновления

export interface CreateTenderInput {
  company_id: string;

  // Обязательные поля
  purchase_number: string;
  subject: string;
  customer: string;
  nmck: number;
  submission_deadline: string;

  // Опциональные поля
  stage_id?: string; // Опционально, определяется автоматически на основе template_id
  project_name?: string;
  method?: string;
  type_id?: string;
  template_id?: string;
  city?: string;
  platform?: string;
  our_price?: number;
  contract_price?: number;
  application_security?: number;
  contract_security?: number;
  auction_date?: string;
  results_date?: string;
  review_date?: string;
  manager_id?: string;
  specialist_id?: string;
  investor_id?: string;
  executor_id?: string;
  comment?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTenderInput {
  // Все поля опциональны при обновлении
  project_name?: string | null;
  subject?: string;
  method?: string | null;
  type_id?: string | null;
  template_id?: string | null;
  customer?: string;
  city?: string | null;
  platform?: string | null;
  nmck?: number;
  our_price?: number | null;
  contract_price?: number | null;
  application_security?: number | null;
  contract_security?: number | null;
  submission_deadline?: string;
  auction_date?: string | null;
  results_date?: string | null;
  review_date?: string | null;
  manager_id?: string | null;
  specialist_id?: string | null;
  investor_id?: string | null;
  executor_id?: string | null;
  stage_id?: string;
  status?: TenderStatus;
  comment?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  winner_inn?: string | null;
  winner_name?: string | null;
  winner_price?: number | null;
}

export interface TenderFilters {
  search?: string;
  purchase_number?: string;
  stage_id?: string;
  status?: TenderStatus;
  type_id?: string;
  template_id?: string;
  manager_id?: string;
  specialist_id?: string;
  investor_id?: string;
  executor_id?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
}

export interface TenderListParams {
  filters?: TenderFilters;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'submission_deadline' | 'nmck' | 'customer';
  sort_order?: 'asc' | 'desc';
}

export interface TenderStats {
  total_count: number;
  active_count: number;
  won_count: number;
  lost_count: number;
  total_nmck: number;
  total_contract_price: number;
  avg_nmck: number;
  conversion_rate: number; // процент побед
}

// Утилиты для работы с финансами

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
 * Форматирует сумму в копейках в строку с рублями
 */
export function formatCurrency(kopecks: number | null | undefined, currency: string = 'RUB'): string {
  if (kopecks === null || kopecks === undefined) return '—';

  const rubles = kopecksToRubles(kopecks);
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency || 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rubles);
}

/**
 * Рассчитывает экономию (НМЦК - цена контракта)
 */
export function calculateSavings(nmck: number, contractPrice: number | null): number | null {
  if (!contractPrice) return null;
  return nmck - contractPrice;
}

/**
 * Рассчитывает процент экономии
 */
export function calculateSavingsPercent(nmck: number, contractPrice: number | null): number | null {
  if (!contractPrice || nmck === 0) return null;
  const savings = calculateSavings(nmck, contractPrice);
  if (savings === null) return null;
  return (savings / nmck) * 100;
}

/**
 * Проверяет, истек ли дедлайн
 */
export function isDeadlinePassed(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

/**
 * Возвращает количество дней до дедлайна
 */
export function daysUntilDeadline(deadline: string): number {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Возвращает статус срочности дедлайна
 */
export function getDeadlineUrgency(deadline: string): 'urgent' | 'warning' | 'normal' | 'passed' {
  if (isDeadlinePassed(deadline)) return 'passed';

  const days = daysUntilDeadline(deadline);
  if (days <= 1) return 'urgent';
  if (days <= 3) return 'warning';
  return 'normal';
}
