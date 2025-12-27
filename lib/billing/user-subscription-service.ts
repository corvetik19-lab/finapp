import { createAdminClient } from '@/lib/supabase/admin';
import type {
  UserSubscriptionPlan,
  UserSubscription,
  UserSubscriptionPayment,
  UserBillingStats,
  UserSubscriptionListItem,
  UserSubscriptionFilters,
  CreateUserSubscriptionInput,
  UpdateUserSubscriptionInput,
  CreateUserPaymentInput,
  UserPriceCalculation,
  UserBillingPeriod,
} from '@/types/user-billing';
import { logger } from "@/lib/logger";

// =====================================================
// Получение данных
// =====================================================

export async function getUserSubscriptionPlans(activeOnly = true, mode = 'finance'): Promise<UserSubscriptionPlan[]> {
  const supabase = createAdminClient();
  
  let query = supabase
    .from('user_subscription_plans')
    .select('*')
    .eq('mode', mode)
    .order('sort_order', { ascending: true });
    
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  
  const { data, error } = await query;
  
  if (error) {
    logger.error('Error fetching user subscription plans:', error);
    return [];
  }
  
  return data || [];
}

export async function getUserSubscriptionPlan(planId: string): Promise<UserSubscriptionPlan | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('user_subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();
    
  if (error) {
    logger.error('Error fetching user subscription plan:', error);
    return null;
  }
  
  return data;
}

export async function getUserSubscriptions(filters?: UserSubscriptionFilters): Promise<UserSubscriptionListItem[]> {
  const supabase = createAdminClient();
  
  let query = supabase
    .from('user_subscriptions')
    .select(`
      *,
      plan:user_subscription_plans(*)
    `);
  
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.mode) {
    query = query.eq('mode', filters.mode);
  }
  
  if (filters?.plan_id) {
    query = query.eq('plan_id', filters.plan_id);
  }

  if (filters?.user_id) {
    query = query.eq('user_id', filters.user_id);
  }
  
  if (filters?.expiring_soon) {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    query = query.lte('current_period_end', sevenDaysFromNow.toISOString());
    query = query.neq('status', 'cancelled');
  }
  
  const sortBy = filters?.sort_by || 'expires';
  const sortOrder = filters?.sort_order === 'desc';
  
  switch (sortBy) {
    case 'user':
      query = query.order('created_at', { ascending: !sortOrder });
      break;
    case 'expires':
      query = query.order('current_period_end', { ascending: !sortOrder });
      break;
    case 'amount':
      query = query.order('amount', { ascending: !sortOrder });
      break;
    default:
      query = query.order('current_period_end', { ascending: true });
  }
  
  const { data: subscriptions, error } = await query;
  
  if (error) {
    logger.error('Error fetching user subscriptions:', { message: error.message, code: error.code, details: error.details });
    return [];
  }
  
  // Логируем для отладки
  logger.debug('Fetched user subscriptions:', { count: subscriptions?.length || 0 });
  
  // Получаем данные пользователей отдельным запросом
  const userIds = [...new Set(subscriptions?.map(s => s.user_id) || [])];
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds);
  
  const usersMap: Record<string, { id: string; email: string; full_name: string }> = {};
  users?.forEach(u => {
    usersMap[u.id] = u;
  });
  
  const subIds = subscriptions?.map(s => s.id) || [];
  
  const { data: payments } = await supabase
    .from('user_subscription_payments')
    .select('subscription_id, amount')
    .eq('status', 'completed')
    .in('subscription_id', subIds);
  
  const totalPaidBySub: Record<string, number> = {};
  payments?.forEach(p => {
    totalPaidBySub[p.subscription_id] = (totalPaidBySub[p.subscription_id] || 0) + p.amount;
  });
  
  const now = new Date();
  
  return (subscriptions || []).map(sub => {
    const expiryDate = new Date(sub.current_period_end);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const user = usersMap[sub.user_id] || null;
    
    return {
      ...sub,
      user,
      days_until_expiry: daysUntilExpiry,
      is_expiring_soon: daysUntilExpiry <= 7 && daysUntilExpiry > 0 && sub.status !== 'cancelled',
      total_paid: totalPaidBySub[sub.id] || 0,
    } as UserSubscriptionListItem;
  }).filter(sub => {
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      const userEmail = sub.user?.email?.toLowerCase() || '';
      const userName = sub.user?.full_name?.toLowerCase() || '';
      return userEmail.includes(search) || userName.includes(search);
    }
    return true;
  });
}

export async function getUserSubscription(userId: string, mode = 'finance'): Promise<UserSubscription | null> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      plan:user_subscription_plans(*),
      user:profiles(id, email, full_name)
    `)
    .eq('user_id', userId)
    .eq('mode', mode)
    .single();
    
  if (error) {
    if (error.code !== 'PGRST116') {
      logger.error('Error fetching user subscription:', error);
    }
    return null;
  }
  
  return data;
}

export async function getUserPayments(userId: string): Promise<UserSubscriptionPayment[]> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('user_subscription_payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    logger.error('Error fetching user payments:', error);
    return [];
  }
  
  return data || [];
}

// =====================================================
// Статистика
// =====================================================

export async function getUserBillingStats(): Promise<UserBillingStats> {
  const supabase = createAdminClient();
  
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('*, plan:user_subscription_plans(*)');
  
  const subs = subscriptions || [];
  
  const activeCount = subs.filter(s => s.status === 'active').length;
  const trialCount = subs.filter(s => s.status === 'trial').length;
  const expiredCount = subs.filter(s => s.status === 'expired').length;
  const cancelledCount = subs.filter(s => s.status === 'cancelled').length;
  
  let mrr = 0;
  subs.filter(s => s.status === 'active' || s.status === 'trial').forEach(sub => {
    if (sub.billing_period === 'monthly') {
      mrr += sub.amount;
    } else {
      mrr += Math.round(sub.amount / 12);
    }
  });
  
  const { data: allPayments } = await supabase
    .from('user_subscription_payments')
    .select('amount')
    .eq('status', 'completed');
  
  const totalRevenue = allPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  
  const planStats: Record<string, { count: number; revenue: number; name: string }> = {};
  subs.forEach(sub => {
    const planId = sub.plan_id || 'no_plan';
    const planName = sub.plan?.name || 'Без плана';
    if (!planStats[planId]) {
      planStats[planId] = { count: 0, revenue: 0, name: planName };
    }
    planStats[planId].count++;
    if (sub.status === 'active' || sub.status === 'trial') {
      planStats[planId].revenue += sub.amount;
    }
  });
  
  const plansDistribution = Object.entries(planStats).map(([planId, stats]) => ({
    plan_id: planId,
    plan_name: stats.name,
    count: stats.count,
    percentage: subs.length > 0 ? Math.round((stats.count / subs.length) * 100) : 0,
    revenue: stats.revenue,
  }));
  
  return {
    total_users_with_subscriptions: subs.length,
    active_subscriptions: activeCount,
    trial_subscriptions: trialCount,
    expired_subscriptions: expiredCount,
    cancelled_subscriptions: cancelledCount,
    mrr,
    total_revenue: totalRevenue,
    plans_distribution: plansDistribution,
  };
}

// =====================================================
// Действия
// =====================================================

export function calculateUserPrice(
  plan: UserSubscriptionPlan,
  billingPeriod: UserBillingPeriod,
  discountPercent = 0
): UserPriceCalculation {
  const basePrice = billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly;
  const discountAmount = Math.round(basePrice * (discountPercent / 100));
  const total = basePrice - discountAmount;
  
  return {
    base_amount: basePrice,
    discount_amount: discountAmount,
    total,
    period: billingPeriod,
  };
}

export async function createUserSubscription(input: CreateUserSubscriptionInput): Promise<UserSubscription | null> {
  const supabase = createAdminClient();
  
  const plan = await getUserSubscriptionPlan(input.plan_id);
  if (!plan) {
    logger.error('Plan not found:', input.plan_id);
    return null;
  }
  
  const billingPeriod = input.billing_period || 'monthly';
  const price = calculateUserPrice(plan, billingPeriod, input.discount_percent || 0);
  
  const now = new Date();
  const periodEnd = new Date(now);
  
  if (billingPeriod === 'yearly') {
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
    .from('user_subscriptions')
    .insert({
      user_id: input.user_id,
      plan_id: input.plan_id,
      mode: input.mode || 'finance',
      billing_period: billingPeriod,
      status: trialEndsAt ? 'trial' : 'active',
      current_period_end: periodEnd.toISOString(),
      trial_ends_at: trialEndsAt,
      amount: price.total,
      discount_percent: input.discount_percent || 0,
      discount_amount: price.discount_amount,
      notes: input.notes,
    })
    .select()
    .single();
    
  if (error) {
    logger.error('Error creating user subscription:', error);
    return null;
  }
  
  await supabase.from('user_subscription_history').insert({
    subscription_id: data.id,
    action: 'created',
    new_plan_id: input.plan_id,
    new_status: data.status,
    notes: input.notes,
  });
  
  return data;
}

export async function updateUserSubscription(
  subscriptionId: string,
  input: UpdateUserSubscriptionInput,
  changedBy?: string
): Promise<UserSubscription | null> {
  const supabase = createAdminClient();
  
  const { data: current } = await supabase
    .from('user_subscriptions')
    .select('*, plan:user_subscription_plans(*)')
    .eq('id', subscriptionId)
    .single();
    
  if (!current) {
    logger.error('Subscription not found:', subscriptionId);
    return null;
  }
  
  const updates: Record<string, unknown> = {};
  let historyAction = 'updated';
  
  if (input.plan_id && input.plan_id !== current.plan_id) {
    const newPlan = await getUserSubscriptionPlan(input.plan_id);
    if (!newPlan) {
      logger.error('New plan not found:', input.plan_id);
      return null;
    }
    
    updates.plan_id = input.plan_id;
    
    const price = calculateUserPrice(
      newPlan,
      input.billing_period || current.billing_period,
      input.discount_percent ?? current.discount_percent
    );
    
    updates.amount = price.total;
    updates.discount_amount = price.discount_amount;
    
    const currentPlanPrice = current.plan?.price_monthly || 0;
    const newPlanPrice = newPlan.price_monthly;
    historyAction = newPlanPrice > currentPlanPrice ? 'upgraded' : 'downgraded';
  }
  
  if (input.billing_period) updates.billing_period = input.billing_period;
  if (input.discount_percent !== undefined) updates.discount_percent = input.discount_percent;
  if (input.status) {
    updates.status = input.status;
    if (input.status === 'cancelled') {
      updates.cancelled_at = new Date().toISOString();
      historyAction = 'cancelled';
    }
  }
  if (input.notes !== undefined) updates.notes = input.notes;
  
  if (input.discount_percent !== undefined && !input.plan_id && current.plan) {
    const price = calculateUserPrice(
      current.plan,
      input.billing_period || current.billing_period,
      input.discount_percent
    );
    updates.amount = price.total;
    updates.discount_amount = price.discount_amount;
  }
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select()
    .single();
    
  if (error) {
    logger.error('Error updating user subscription:', error);
    return null;
  }
  
  await supabase.from('user_subscription_history').insert({
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

export async function createUserPayment(input: CreateUserPaymentInput): Promise<UserSubscriptionPayment | null> {
  const supabase = createAdminClient();
  
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('user_id, current_period_start, current_period_end')
    .eq('id', input.subscription_id)
    .single();
    
  if (!subscription) {
    logger.error('Subscription not found');
    return null;
  }
  
  const { data, error } = await supabase
    .from('user_subscription_payments')
    .insert({
      subscription_id: input.subscription_id,
      user_id: subscription.user_id,
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
    logger.error('Error creating user payment:', error);
    return null;
  }
  
  await supabase
    .from('user_subscriptions')
    .update({ status: 'active' })
    .eq('id', input.subscription_id)
    .in('status', ['past_due', 'trial']);
  
  return data;
}

export async function cancelUserSubscription(subscriptionId: string, changedBy?: string): Promise<boolean> {
  const result = await updateUserSubscription(subscriptionId, { status: 'cancelled' }, changedBy);
  return result !== null;
}

/**
 * Продлить подписку на следующий период
 */
export async function renewUserSubscription(
  subscriptionId: string,
  changedBy?: string
): Promise<UserSubscription | null> {
  const supabase = createAdminClient();
  
  const { data: current } = await supabase
    .from('user_subscriptions')
    .select('*, plan:user_subscription_plans(*)')
    .eq('id', subscriptionId)
    .single();
    
  if (!current) {
    logger.error('Subscription not found:', subscriptionId);
    return null;
  }
  
  const newPeriodStart = new Date(current.current_period_end);
  const newPeriodEnd = new Date(newPeriodStart);
  
  if (current.billing_period === 'yearly') {
    newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
  } else {
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
  }
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'active',
      current_period_start: newPeriodStart.toISOString(),
      current_period_end: newPeriodEnd.toISOString(),
      cancelled_at: null,
    })
    .eq('id', subscriptionId)
    .select()
    .single();
    
  if (error) {
    logger.error('Error renewing subscription:', error);
    return null;
  }
  
  await supabase.from('user_subscription_history').insert({
    subscription_id: subscriptionId,
    action: 'renewed',
    old_status: current.status,
    new_status: 'active',
    changed_by: changedBy,
    notes: `Продлено до ${newPeriodEnd.toLocaleDateString('ru-RU')}`,
  });
  
  return data;
}

/**
 * Приостановить подписку
 */
export async function suspendUserSubscription(
  subscriptionId: string,
  reason?: string,
  changedBy?: string
): Promise<UserSubscription | null> {
  const supabase = createAdminClient();
  
  const { data: current } = await supabase
    .from('user_subscriptions')
    .select('status')
    .eq('id', subscriptionId)
    .single();
    
  if (!current) {
    logger.error('Subscription not found:', subscriptionId);
    return null;
  }
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_reason: reason,
    })
    .eq('id', subscriptionId)
    .select()
    .single();
    
  if (error) {
    logger.error('Error suspending subscription:', error);
    return null;
  }
  
  await supabase.from('user_subscription_history').insert({
    subscription_id: subscriptionId,
    action: 'suspended',
    old_status: current.status,
    new_status: 'suspended',
    changed_by: changedBy,
    notes: reason || 'Подписка приостановлена',
  });
  
  return data;
}

/**
 * Возобновить приостановленную подписку
 */
export async function resumeUserSubscription(
  subscriptionId: string,
  changedBy?: string
): Promise<UserSubscription | null> {
  const supabase = createAdminClient();
  
  const { data: current } = await supabase
    .from('user_subscriptions')
    .select('status, current_period_end')
    .eq('id', subscriptionId)
    .single();
    
  if (!current || current.status !== 'suspended') {
    logger.error('Subscription not found or not suspended:', subscriptionId);
    return null;
  }
  
  // Проверяем не истёк ли период
  const periodEnd = new Date(current.current_period_end);
  const newStatus = periodEnd > new Date() ? 'active' : 'expired';
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({
      status: newStatus,
      suspended_at: null,
      suspended_reason: null,
    })
    .eq('id', subscriptionId)
    .select()
    .single();
    
  if (error) {
    logger.error('Error resuming subscription:', error);
    return null;
  }
  
  await supabase.from('user_subscription_history').insert({
    subscription_id: subscriptionId,
    action: 'resumed',
    old_status: 'suspended',
    new_status: newStatus,
    changed_by: changedBy,
    notes: 'Подписка возобновлена',
  });
  
  return data;
}

/**
 * Полностью удалить подписку (только для super_admin)
 */
export async function deleteUserSubscription(
  subscriptionId: string,
  changedBy?: string
): Promise<boolean> {
  const supabase = createAdminClient();
  
  // Сначала записываем в историю
  const { data: current } = await supabase
    .from('user_subscriptions')
    .select('user_id, plan_id, status')
    .eq('id', subscriptionId)
    .single();
    
  if (!current) {
    return false;
  }
  
  await supabase.from('user_subscription_history').insert({
    subscription_id: subscriptionId,
    action: 'deleted',
    old_status: current.status,
    new_status: null,
    changed_by: changedBy,
    notes: 'Подписка удалена',
  });
  
  // Удаляем подписку
  const { error } = await supabase
    .from('user_subscriptions')
    .delete()
    .eq('id', subscriptionId);
    
  if (error) {
    logger.error('Error deleting subscription:', error);
    return false;
  }
  
  return true;
}

export async function hasUserModeAccess(userId: string, mode: string): Promise<boolean> {
  const supabase = createAdminClient();
  
  // Super admin имеет доступ ко всем режимам
  const { data: profile } = await supabase
    .from('profiles')
    .select('global_role')
    .eq('id', userId)
    .single();
    
  if (profile?.global_role === 'super_admin') {
    return true;
  }
  
  // Проверяем подписку пользователя на режим
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('status')
    .eq('user_id', userId)
    .eq('mode', mode)
    .in('status', ['active', 'trial'])
    .single();
    
  return !!subscription;
}
