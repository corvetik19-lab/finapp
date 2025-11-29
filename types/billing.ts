// =====================================================
// Типы для системы биллинга и подписок
// =====================================================

// Статусы подписки
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';

// Период оплаты
export type BillingPeriod = 'monthly' | 'yearly';

// Статус платежа
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

// Статус счёта
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

// Тарифный план
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  base_price_monthly: number; // в копейках
  base_price_yearly: number;
  price_per_user_monthly: number;
  price_per_user_yearly: number;
  users_included: number;
  max_users: number | null;
  allowed_modes: string[];
  features: PlanFeatures;
  storage_limit_mb: number;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Возможности плана
export interface PlanFeatures {
  transactions_limit: number; // -1 = безлимит
  reports: boolean;
  ai_features: boolean;
  api_access: boolean;
  dedicated_support?: boolean;
  custom_integrations?: boolean;
  [key: string]: unknown;
}

// Подписка организации
export interface OrganizationSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_period: BillingPeriod;
  started_at: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  users_count: number;
  base_amount: number;
  users_amount: number;
  total_amount: number;
  discount_percent: number;
  discount_amount: number;
  next_payment_amount: number | null;
  next_payment_date: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Связанные данные
  plan?: SubscriptionPlan;
  organization?: OrganizationBillingInfo;
}

// Информация об организации для биллинга
export interface OrganizationBillingInfo {
  id: string;
  name: string;
  created_at: string;
  // Рассчитанные поля
  users_count?: number;
  companies_count?: number;
}

// Платёж
export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  organization_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  invoice_number: string | null;
  period_start: string | null;
  period_end: string | null;
  description: string | null;
  details: Record<string, unknown>;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
  // Связанные данные
  organization?: OrganizationBillingInfo;
}

// Счёт (инвойс)
export interface SubscriptionInvoice {
  id: string;
  subscription_id: string;
  organization_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  line_items: InvoiceLineItem[];
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Связанные данные
  organization?: OrganizationBillingInfo;
}

// Строка счёта
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

// История изменений подписки
export interface SubscriptionHistoryItem {
  id: string;
  subscription_id: string;
  action: string;
  old_plan_id: string | null;
  new_plan_id: string | null;
  old_status: string | null;
  new_status: string | null;
  changed_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// =====================================================
// Типы для дашборда супер-админа
// =====================================================

// Статистика биллинга
export interface BillingStats {
  // Общая статистика
  total_organizations: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  expired_subscriptions: number;
  cancelled_subscriptions: number;
  
  // Финансовые показатели (в копейках)
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  total_revenue: number; // Общая выручка за всё время
  revenue_this_month: number;
  revenue_last_month: number;
  revenue_growth_percent: number;
  
  // Пользователи
  total_users: number;
  paying_users: number;
  free_users: number;
  
  // Средние показатели
  avg_revenue_per_org: number;
  avg_users_per_org: number;
  
  // По планам
  plans_distribution: PlanDistribution[];
}

// Распределение по планам
export interface PlanDistribution {
  plan_id: string;
  plan_name: string;
  count: number;
  percentage: number;
  revenue: number;
}

// Подписка с расширенной информацией для списка
export interface SubscriptionListItem extends OrganizationSubscription {
  organization: OrganizationBillingInfo;
  plan: SubscriptionPlan;
  days_until_expiry: number;
  is_expiring_soon: boolean; // < 7 дней
  total_paid: number; // сумма всех платежей
}

// Фильтры для списка подписок
export interface SubscriptionFilters {
  status?: SubscriptionStatus | 'all';
  plan_id?: string;
  search?: string;
  expiring_soon?: boolean;
  sort_by?: 'organization' | 'plan' | 'status' | 'expires' | 'amount' | 'users';
  sort_order?: 'asc' | 'desc';
}

// =====================================================
// Типы для действий
// =====================================================

// Создание/обновление подписки
export interface CreateSubscriptionInput {
  organization_id: string;
  plan_id: string;
  billing_period: BillingPeriod;
  users_count?: number;
  discount_percent?: number;
  trial_days?: number;
  notes?: string;
}

export interface UpdateSubscriptionInput {
  plan_id?: string;
  billing_period?: BillingPeriod;
  users_count?: number;
  discount_percent?: number;
  status?: SubscriptionStatus;
  notes?: string;
}

// Создание платежа
export interface CreatePaymentInput {
  subscription_id: string;
  amount: number;
  payment_method?: string;
  description?: string;
}

// Результат расчёта стоимости
export interface PriceCalculation {
  base_amount: number;
  users_amount: number;
  extra_users: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  period: BillingPeriod;
}

// Переопределение цен для организации
export interface OrganizationPriceOverride {
  id: string;
  organization_id: string;
  // Переопределённые цены (в копейках), NULL = стандартная цена
  base_price_monthly: number | null;
  base_price_yearly: number | null;
  price_per_user_monthly: number | null;
  price_per_user_yearly: number | null;
  users_included: number | null;
  max_users: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Ввод для создания/обновления переопределения цен
export interface PriceOverrideInput {
  organization_id: string;
  base_price_monthly?: number | null;
  base_price_yearly?: number | null;
  price_per_user_monthly?: number | null;
  price_per_user_yearly?: number | null;
  users_included?: number | null;
  max_users?: number | null;
  notes?: string | null;
}
