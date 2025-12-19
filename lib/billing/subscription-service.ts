import { createAdminClient } from '@/lib/supabase/admin';
import type {
  SubscriptionPlan,
  OrganizationSubscription,
  SubscriptionPayment,
  SubscriptionInvoice,
  BillingStats,
  SubscriptionListItem,
  SubscriptionFilters,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  CreatePaymentInput,
  PriceCalculation,
  BillingPeriod,
} from '@/types/billing';
import { logger } from "@/lib/logger";

// =====================================================
// Получение данных
// =====================================================

/**
 * Получить все тарифные планы
 */
export async function getSubscriptionPlans(activeOnly = true): Promise<SubscriptionPlan[]> {
  const supabase = createAdminClient();
  
  let query = supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order', { ascending: true });
    
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  
  const { data, error } = await query;
  
  if (error) {
    logger.error('Error fetching subscription plans:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Получить план по ID
 */
export async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();
    
  if (error) {
    logger.error('Error fetching subscription plan:', error);
    return null;
  }
  
  return data;
}

/**
 * Получить все подписки с фильтрами
 */
export async function getSubscriptions(filters?: SubscriptionFilters): Promise<SubscriptionListItem[]> {
  const supabase = createAdminClient();
  
  // Получаем подписки с организациями и планами
  let query = supabase
    .from('organization_subscriptions')
    .select(`
      *,
      organization:organizations(id, name, created_at),
      plan:subscription_plans(*)
    `);
  
  // Применяем фильтры
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.plan_id) {
    query = query.eq('plan_id', filters.plan_id);
  }
  
  if (filters?.expiring_soon) {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    query = query.lte('current_period_end', sevenDaysFromNow.toISOString());
    query = query.neq('status', 'cancelled');
  }
  
  // Сортировка
  const sortBy = filters?.sort_by || 'expires';
  const sortOrder = filters?.sort_order === 'desc';
  
  switch (sortBy) {
    case 'organization':
      // Сортировка по организации требует JOIN, пока по дате
      query = query.order('created_at', { ascending: !sortOrder });
      break;
    case 'expires':
      query = query.order('current_period_end', { ascending: !sortOrder });
      break;
    case 'amount':
      query = query.order('total_amount', { ascending: !sortOrder });
      break;
    case 'users':
      query = query.order('users_count', { ascending: !sortOrder });
      break;
    default:
      query = query.order('current_period_end', { ascending: true });
  }
  
  const { data: subscriptions, error } = await query;
  
  if (error) {
    logger.error('Error fetching subscriptions:', error);
    return [];
  }
  
  // Получаем количество пользователей для каждой организации
  const orgIds = subscriptions?.map(s => s.organization_id) || [];
  
  const { data: userCounts } = await supabase
    .from('company_members')
    .select('company_id, companies!inner(organization_id)')
    .eq('status', 'active')
    .in('companies.organization_id', orgIds);
  
  // Считаем пользователей по организациям
  const usersByOrg: Record<string, number> = {};
  userCounts?.forEach((uc: { companies: { organization_id: string } | { organization_id: string }[] }) => {
    const companies = uc.companies;
    const orgId = Array.isArray(companies) ? companies[0]?.organization_id : companies?.organization_id;
    if (orgId) {
      usersByOrg[orgId] = (usersByOrg[orgId] || 0) + 1;
    }
  });
  
  // Получаем сумму платежей для каждой подписки
  const subIds = subscriptions?.map(s => s.id) || [];
  
  const { data: payments } = await supabase
    .from('subscription_payments')
    .select('subscription_id, amount')
    .eq('status', 'completed')
    .in('subscription_id', subIds);
  
  const totalPaidBySub: Record<string, number> = {};
  payments?.forEach(p => {
    totalPaidBySub[p.subscription_id] = (totalPaidBySub[p.subscription_id] || 0) + p.amount;
  });
  
  // Формируем результат
  const now = new Date();
  
  return (subscriptions || []).map(sub => {
    const expiryDate = new Date(sub.current_period_end);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      ...sub,
      organization: {
        ...sub.organization,
        users_count: usersByOrg[sub.organization_id] || 0,
      },
      days_until_expiry: daysUntilExpiry,
      is_expiring_soon: daysUntilExpiry <= 7 && daysUntilExpiry > 0 && sub.status !== 'cancelled',
      total_paid: totalPaidBySub[sub.id] || 0,
    } as SubscriptionListItem;
  }).filter(sub => {
    // Фильтр по поиску
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      return sub.organization?.name?.toLowerCase().includes(search);
    }
    return true;
  });
}

/**
 * Получить подписку организации
 */
export async function getOrganizationSubscription(organizationId: string): Promise<OrganizationSubscription | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('organization_subscriptions')
    .select(`
      *,
      plan:subscription_plans(*),
      organization:organizations(id, name, created_at)
    `)
    .eq('organization_id', organizationId)
    .single();
    
  if (error) {
    logger.error('Error fetching organization subscription:', error);
    return null;
  }
  
  return data;
}

/**
 * Получить платежи организации
 */
export async function getOrganizationPayments(organizationId: string): Promise<SubscriptionPayment[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
    
  if (error) {
    logger.error('Error fetching payments:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Получить все платежи
 */
export async function getAllPayments(limit = 50): Promise<SubscriptionPayment[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('subscription_payments')
    .select(`
      *,
      organization:organizations(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) {
    logger.error('Error fetching all payments:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Получить счета организации
 */
export async function getOrganizationInvoices(organizationId: string): Promise<SubscriptionInvoice[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('subscription_invoices')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
    
  if (error) {
    logger.error('Error fetching invoices:', error);
    return [];
  }
  
  return data || [];
}

// =====================================================
// Статистика
// =====================================================

/**
 * Получить статистику биллинга
 */
export async function getBillingStats(): Promise<BillingStats> {
  const supabase = createAdminClient();
  
  // Базовая статистика по подпискам
  const { data: subscriptions } = await supabase
    .from('organization_subscriptions')
    .select('*, plan:subscription_plans(*)');
  
  const subs = subscriptions || [];
  
  const activeCount = subs.filter(s => s.status === 'active').length;
  const trialCount = subs.filter(s => s.status === 'trial').length;
  const expiredCount = subs.filter(s => s.status === 'expired').length;
  const cancelledCount = subs.filter(s => s.status === 'cancelled').length;
  
  // Считаем MRR (только активные подписки)
  let mrr = 0;
  subs.filter(s => s.status === 'active' || s.status === 'trial').forEach(sub => {
    if (sub.billing_period === 'monthly') {
      mrr += sub.total_amount;
    } else {
      // Годовая подписка - делим на 12
      mrr += Math.round(sub.total_amount / 12);
    }
  });
  
  // ARR
  const arr = mrr * 12;
  
  // Выручка за текущий и прошлый месяц
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  
  const { data: paymentsThisMonth } = await supabase
    .from('subscription_payments')
    .select('amount')
    .eq('status', 'completed')
    .gte('payment_date', startOfMonth.toISOString());
  
  const { data: paymentsLastMonth } = await supabase
    .from('subscription_payments')
    .select('amount')
    .eq('status', 'completed')
    .gte('payment_date', startOfLastMonth.toISOString())
    .lte('payment_date', endOfLastMonth.toISOString());
  
  const { data: allPayments } = await supabase
    .from('subscription_payments')
    .select('amount')
    .eq('status', 'completed');
  
  const revenueThisMonth = paymentsThisMonth?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const revenueLastMonth = paymentsLastMonth?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalRevenue = allPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  
  const revenueGrowth = revenueLastMonth > 0 
    ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100) 
    : 0;
  
  // Пользователи
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .neq('global_role', 'super_admin');
  
  // Количество организаций
  const { count: totalOrgs } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true });
  
  // Платящие пользователи (из организаций с платными подписками)
  const paidOrgIds = subs
    .filter(s => (s.status === 'active' || s.status === 'trial') && s.total_amount > 0)
    .map(s => s.organization_id);
  
  const { data: paidUsers } = await supabase
    .from('company_members')
    .select('user_id, companies!inner(organization_id)')
    .eq('status', 'active')
    .in('companies.organization_id', paidOrgIds);
  
  const uniquePaidUsers = new Set(paidUsers?.map(u => u.user_id) || []).size;
  
  // Общее количество пользователей в подписках
  const totalSubUsers = subs.reduce((sum, s) => sum + s.users_count, 0);
  
  // Распределение по планам
  const planStats: Record<string, { count: number; revenue: number; name: string }> = {};
  subs.forEach(sub => {
    const planId = sub.plan_id;
    const planName = sub.plan?.name || 'Неизвестный';
    if (!planStats[planId]) {
      planStats[planId] = { count: 0, revenue: 0, name: planName };
    }
    planStats[planId].count++;
    if (sub.status === 'active' || sub.status === 'trial') {
      planStats[planId].revenue += sub.total_amount;
    }
  });
  
  const plansDistribution = Object.entries(planStats).map(([planId, stats]) => ({
    plan_id: planId,
    plan_name: stats.name,
    count: stats.count,
    percentage: Math.round((stats.count / subs.length) * 100),
    revenue: stats.revenue,
  }));
  
  return {
    total_organizations: totalOrgs || 0,
    active_subscriptions: activeCount,
    trial_subscriptions: trialCount,
    expired_subscriptions: expiredCount,
    cancelled_subscriptions: cancelledCount,
    mrr,
    arr,
    total_revenue: totalRevenue,
    revenue_this_month: revenueThisMonth,
    revenue_last_month: revenueLastMonth,
    revenue_growth_percent: revenueGrowth,
    total_users: totalUsers || 0,
    paying_users: uniquePaidUsers,
    free_users: (totalUsers || 0) - uniquePaidUsers,
    avg_revenue_per_org: activeCount > 0 ? Math.round(mrr / activeCount) : 0,
    avg_users_per_org: subs.length > 0 ? Math.round(totalSubUsers / subs.length) : 0,
    plans_distribution: plansDistribution,
  };
}

// =====================================================
// Действия
// =====================================================

/**
 * Рассчитать стоимость подписки
 */
export function calculatePrice(
  plan: SubscriptionPlan,
  usersCount: number,
  billingPeriod: BillingPeriod,
  discountPercent = 0
): PriceCalculation {
  const isYearly = billingPeriod === 'yearly';
  
  const basePrice = isYearly ? plan.base_price_yearly : plan.base_price_monthly;
  const pricePerUser = isYearly ? plan.price_per_user_yearly : plan.price_per_user_monthly;
  
  const extraUsers = Math.max(0, usersCount - plan.users_included);
  const usersAmount = extraUsers * pricePerUser;
  
  const subtotal = basePrice + usersAmount;
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const total = subtotal - discountAmount;
  
  return {
    base_amount: basePrice,
    users_amount: usersAmount,
    extra_users: extraUsers,
    subtotal,
    discount_amount: discountAmount,
    total,
    period: billingPeriod,
  };
}

/**
 * Создать подписку для организации
 */
export async function createSubscription(input: CreateSubscriptionInput): Promise<OrganizationSubscription | null> {
  const supabase = createAdminClient();
  
  // Получаем план
  const plan = await getSubscriptionPlan(input.plan_id);
  if (!plan) {
    logger.error('Plan not found:', input.plan_id);
    return null;
  }
  
  // Рассчитываем стоимость
  const price = calculatePrice(
    plan,
    input.users_count || 1,
    input.billing_period,
    input.discount_percent || 0
  );
  
  // Определяем даты
  const now = new Date();
  const periodEnd = new Date(now);
  
  if (input.billing_period === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }
  
  let trialEndsAt: string | null = null;
  if (input.trial_days && input.trial_days > 0) {
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + input.trial_days);
    trialEndsAt = trialEnd.toISOString();
  }
  
  const { data, error } = await supabase
    .from('organization_subscriptions')
    .insert({
      organization_id: input.organization_id,
      plan_id: input.plan_id,
      billing_period: input.billing_period,
      status: trialEndsAt ? 'trial' : 'active',
      current_period_end: periodEnd.toISOString(),
      trial_ends_at: trialEndsAt,
      users_count: input.users_count || 1,
      base_amount: price.base_amount,
      users_amount: price.users_amount,
      total_amount: price.total,
      discount_percent: input.discount_percent || 0,
      discount_amount: price.discount_amount,
      next_payment_amount: price.total,
      next_payment_date: periodEnd.toISOString(),
      notes: input.notes,
    })
    .select()
    .single();
    
  if (error) {
    logger.error('Error creating subscription:', error);
    return null;
  }
  
  // Записываем в историю
  await supabase.from('subscription_history').insert({
    subscription_id: data.id,
    action: 'created',
    new_plan_id: input.plan_id,
    new_status: data.status,
    notes: input.notes,
  });
  
  return data;
}

/**
 * Обновить подписку
 */
export async function updateSubscription(
  subscriptionId: string,
  input: UpdateSubscriptionInput,
  changedBy?: string
): Promise<OrganizationSubscription | null> {
  const supabase = createAdminClient();
  
  // Получаем текущую подписку
  const { data: current } = await supabase
    .from('organization_subscriptions')
    .select('*, plan:subscription_plans(*)')
    .eq('id', subscriptionId)
    .single();
    
  if (!current) {
    logger.error('Subscription not found:', subscriptionId);
    return null;
  }
  
  const updates: Record<string, unknown> = {};
  let historyAction = 'updated';
  
  // Если меняется план
  if (input.plan_id && input.plan_id !== current.plan_id) {
    const newPlan = await getSubscriptionPlan(input.plan_id);
    if (!newPlan) {
      logger.error('New plan not found:', input.plan_id);
      return null;
    }
    
    updates.plan_id = input.plan_id;
    
    // Пересчитываем стоимость
    const price = calculatePrice(
      newPlan,
      input.users_count || current.users_count,
      input.billing_period || current.billing_period,
      input.discount_percent ?? current.discount_percent
    );
    
    updates.base_amount = price.base_amount;
    updates.users_amount = price.users_amount;
    updates.total_amount = price.total;
    updates.discount_amount = price.discount_amount;
    updates.next_payment_amount = price.total;
    
    // Определяем тип изменения
    const currentPlanPrice = current.plan?.base_price_monthly || 0;
    const newPlanPrice = newPlan.base_price_monthly;
    historyAction = newPlanPrice > currentPlanPrice ? 'upgraded' : 'downgraded';
  }
  
  // Другие поля
  if (input.billing_period) updates.billing_period = input.billing_period;
  if (input.users_count !== undefined) updates.users_count = input.users_count;
  if (input.discount_percent !== undefined) updates.discount_percent = input.discount_percent;
  if (input.status) {
    updates.status = input.status;
    if (input.status === 'cancelled') {
      updates.cancelled_at = new Date().toISOString();
      historyAction = 'cancelled';
    }
  }
  if (input.notes !== undefined) updates.notes = input.notes;
  
  // Пересчитываем стоимость если нужно
  if ((input.users_count !== undefined || input.discount_percent !== undefined) && !input.plan_id) {
    const plan = current.plan;
    if (plan) {
      const price = calculatePrice(
        plan,
        input.users_count ?? current.users_count,
        input.billing_period || current.billing_period,
        input.discount_percent ?? current.discount_percent
      );
      updates.base_amount = price.base_amount;
      updates.users_amount = price.users_amount;
      updates.total_amount = price.total;
      updates.discount_amount = price.discount_amount;
      updates.next_payment_amount = price.total;
    }
  }
  
  const { data, error } = await supabase
    .from('organization_subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select()
    .single();
    
  if (error) {
    logger.error('Error updating subscription:', error);
    return null;
  }
  
  // Записываем в историю
  await supabase.from('subscription_history').insert({
    subscription_id: subscriptionId,
    action: historyAction,
    old_plan_id: current.plan_id,
    new_plan_id: input.plan_id || current.plan_id,
    old_status: current.status,
    new_status: input.status || current.status,
    changed_by: changedBy,
    notes: input.notes,
  });
  
  return data;
}

/**
 * Создать платёж
 */
export async function createPayment(input: CreatePaymentInput): Promise<SubscriptionPayment | null> {
  const supabase = createAdminClient();
  
  // Получаем подписку
  const { data: subscription } = await supabase
    .from('organization_subscriptions')
    .select('organization_id, current_period_start, current_period_end')
    .eq('id', input.subscription_id)
    .single();
    
  if (!subscription) {
    logger.error('Subscription not found');
    return null;
  }
  
  const { data, error } = await supabase
    .from('subscription_payments')
    .insert({
      subscription_id: input.subscription_id,
      organization_id: subscription.organization_id,
      amount: input.amount,
      status: 'completed',
      payment_method: input.payment_method,
      period_start: subscription.current_period_start,
      period_end: subscription.current_period_end,
      description: input.description,
      payment_date: new Date().toISOString(),
    })
    .select()
    .single();
    
  if (error) {
    logger.error('Error creating payment:', error);
    return null;
  }
  
  // Обновляем статус подписки если нужно
  await supabase
    .from('organization_subscriptions')
    .update({ status: 'active' })
    .eq('id', input.subscription_id)
    .in('status', ['past_due', 'trial']);
  
  return data;
}

/**
 * Продлить подписку
 */
export async function renewSubscription(subscriptionId: string): Promise<OrganizationSubscription | null> {
  const supabase = createAdminClient();
  
  const { data: current } = await supabase
    .from('organization_subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();
    
  if (!current) {
    logger.error('Subscription not found');
    return null;
  }
  
  const periodEnd = new Date(current.current_period_end);
  const newPeriodStart = new Date(periodEnd);
  
  if (current.billing_period === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }
  
  const { data, error } = await supabase
    .from('organization_subscriptions')
    .update({
      current_period_start: newPeriodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_payment_date: periodEnd.toISOString(),
      status: 'active',
    })
    .eq('id', subscriptionId)
    .select()
    .single();
    
  if (error) {
    logger.error('Error renewing subscription:', error);
    return null;
  }
  
  // Записываем в историю
  await supabase.from('subscription_history').insert({
    subscription_id: subscriptionId,
    action: 'renewed',
    old_status: current.status,
    new_status: 'active',
  });
  
  return data;
}

/**
 * Отменить подписку
 */
export async function cancelSubscription(subscriptionId: string, changedBy?: string): Promise<boolean> {
  const result = await updateSubscription(subscriptionId, { status: 'cancelled' }, changedBy);
  return result !== null;
}

/**
 * Генерация номера счёта
 */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}${month}-${random}`;
}
