/**
 * Типы для системы пользовательских подписок (режим Финансы)
 */

export type UserSubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'past_due' | 'suspended';
export type UserBillingPeriod = 'monthly' | 'yearly';

/**
 * Тарифный план для пользователя
 */
export interface UserSubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  mode: string; // 'finance', 'investments'
  price_monthly: number; // в копейках
  price_yearly: number;
  features: {
    reports?: boolean;
    ai_features?: boolean;
    export?: boolean;
    priority_support?: boolean;
    [key: string]: boolean | undefined;
  };
  limits: {
    transactions_limit?: number; // -1 = безлимит
    accounts_limit?: number;
    categories_limit?: number;
    [key: string]: number | undefined;
  };
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Подписка пользователя
 */
export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  mode: string;
  status: UserSubscriptionStatus;
  billing_period: UserBillingPeriod;
  started_at: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  amount: number; // в копейках
  discount_percent: number;
  discount_amount: number;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Связанные данные
  plan?: UserSubscriptionPlan;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

/**
 * Платёж по подписке пользователя
 */
export interface UserSubscriptionPayment {
  id: string;
  subscription_id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string | null;
  payment_date: string | null;
  period_start: string | null;
  period_end: string | null;
  description: string | null;
  external_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Связанные данные
  user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

/**
 * Запись истории подписки
 */
export interface UserSubscriptionHistoryEntry {
  id: string;
  subscription_id: string;
  action: 'created' | 'upgraded' | 'downgraded' | 'cancelled' | 'renewed' | 'expired' | 'suspended' | 'resumed' | 'deleted';
  old_plan_id: string | null;
  new_plan_id: string | null;
  old_status: string | null;
  new_status: string | null;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

/**
 * Элемент списка подписок для SuperAdmin
 */
export interface UserSubscriptionListItem extends UserSubscription {
  days_until_expiry: number;
  is_expiring_soon: boolean;
  total_paid: number;
}

/**
 * Фильтры для списка подписок
 */
export interface UserSubscriptionFilters {
  status?: UserSubscriptionStatus | 'all';
  mode?: string;
  plan_id?: string;
  user_id?: string;
  search?: string;
  expiring_soon?: boolean;
  sort_by?: 'user' | 'expires' | 'amount' | 'created';
  sort_order?: 'asc' | 'desc';
}

/**
 * Входные данные для создания подписки
 */
export interface CreateUserSubscriptionInput {
  user_id: string;
  plan_id: string;
  mode?: string;
  billing_period?: UserBillingPeriod;
  discount_percent?: number;
  trial_days?: number;
  notes?: string;
}

/**
 * Входные данные для обновления подписки
 */
export interface UpdateUserSubscriptionInput {
  plan_id?: string;
  status?: UserSubscriptionStatus;
  billing_period?: UserBillingPeriod;
  discount_percent?: number;
  notes?: string;
}

/**
 * Входные данные для создания платежа
 */
export interface CreateUserPaymentInput {
  subscription_id: string;
  amount: number;
  payment_method?: string;
  description?: string;
}

/**
 * Статистика по пользовательским подпискам
 */
export interface UserBillingStats {
  total_users_with_subscriptions: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  expired_subscriptions: number;
  cancelled_subscriptions: number;
  mrr: number; // Monthly Recurring Revenue
  total_revenue: number;
  plans_distribution: {
    plan_id: string;
    plan_name: string;
    count: number;
    percentage: number;
    revenue: number;
  }[];
}

/**
 * Расчёт стоимости
 */
export interface UserPriceCalculation {
  base_amount: number;
  discount_amount: number;
  total: number;
  period: UserBillingPeriod;
}
