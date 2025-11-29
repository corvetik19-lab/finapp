'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  createSubscription, 
  updateSubscription, 
  createPayment,
  renewSubscription,
  cancelSubscription,
  calculatePrice,
  getSubscriptionPlan,
} from '@/lib/billing/subscription-service';
import type { BillingPeriod } from '@/types/billing';

// Создать подписку для организации
export async function createOrganizationSubscription(formData: FormData) {
  const organizationId = formData.get('organization_id') as string;
  const planId = formData.get('plan_id') as string;
  const billingPeriod = formData.get('billing_period') as BillingPeriod;
  const usersCount = parseInt(formData.get('users_count') as string) || 1;
  const discountPercent = parseInt(formData.get('discount_percent') as string) || 0;
  const trialDays = parseInt(formData.get('trial_days') as string) || 0;
  const notes = formData.get('notes') as string;

  try {
    const result = await createSubscription({
      organization_id: organizationId,
      plan_id: planId,
      billing_period: billingPeriod,
      users_count: usersCount,
      discount_percent: discountPercent,
      trial_days: trialDays,
      notes: notes || undefined,
    });

    if (!result) {
      return { success: false, error: 'Не удалось создать подписку' };
    }

    revalidatePath('/superadmin');
    revalidatePath('/superadmin/billing');
    revalidatePath('/superadmin/organizations');
    revalidatePath(`/superadmin/organizations/${organizationId}`);

    return { success: true, data: result };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return { success: false, error: 'Ошибка при создании подписки' };
  }
}

// Обновить подписку
export async function updateOrganizationSubscription(formData: FormData) {
  const subscriptionId = formData.get('subscription_id') as string;
  const organizationId = formData.get('organization_id') as string;
  const planId = formData.get('plan_id') as string;
  const billingPeriod = formData.get('billing_period') as BillingPeriod;
  const usersCount = parseInt(formData.get('users_count') as string) || 1;
  const discountPercent = parseInt(formData.get('discount_percent') as string) || 0;
  const notes = formData.get('notes') as string;

  try {
    const result = await updateSubscription(subscriptionId, {
      plan_id: planId || undefined,
      billing_period: billingPeriod || undefined,
      users_count: usersCount,
      discount_percent: discountPercent,
      notes: notes || undefined,
    });

    if (!result) {
      return { success: false, error: 'Не удалось обновить подписку' };
    }

    revalidatePath('/superadmin');
    revalidatePath('/superadmin/billing');
    revalidatePath('/superadmin/organizations');
    revalidatePath(`/superadmin/organizations/${organizationId}`);

    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { success: false, error: 'Ошибка при обновлении подписки' };
  }
}

// Добавить платёж
export async function addPayment(formData: FormData) {
  const subscriptionId = formData.get('subscription_id') as string;
  const organizationId = formData.get('organization_id') as string;
  const amount = parseInt(formData.get('amount') as string) || 0;
  const paymentMethod = formData.get('payment_method') as string;
  const description = formData.get('description') as string;

  try {
    const result = await createPayment({
      subscription_id: subscriptionId,
      amount: amount,
      payment_method: paymentMethod || undefined,
      description: description || undefined,
    });

    if (!result) {
      return { success: false, error: 'Не удалось добавить платёж' };
    }

    revalidatePath('/superadmin');
    revalidatePath('/superadmin/billing');
    revalidatePath('/superadmin/payments');
    revalidatePath(`/superadmin/organizations/${organizationId}`);

    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding payment:', error);
    return { success: false, error: 'Ошибка при добавлении платежа' };
  }
}

// Продлить подписку
export async function renewOrganizationSubscription(formData: FormData) {
  const subscriptionId = formData.get('subscription_id') as string;
  const organizationId = formData.get('organization_id') as string;

  try {
    const result = await renewSubscription(subscriptionId);

    if (!result) {
      return { success: false, error: 'Не удалось продлить подписку' };
    }

    revalidatePath('/superadmin');
    revalidatePath('/superadmin/billing');
    revalidatePath(`/superadmin/organizations/${organizationId}`);

    return { success: true, data: result };
  } catch (error) {
    console.error('Error renewing subscription:', error);
    return { success: false, error: 'Ошибка при продлении подписки' };
  }
}

// Отменить подписку
export async function cancelOrganizationSubscription(formData: FormData) {
  const subscriptionId = formData.get('subscription_id') as string;
  const organizationId = formData.get('organization_id') as string;

  try {
    const result = await cancelSubscription(subscriptionId);

    if (!result) {
      return { success: false, error: 'Не удалось отменить подписку' };
    }

    revalidatePath('/superadmin');
    revalidatePath('/superadmin/billing');
    revalidatePath(`/superadmin/organizations/${organizationId}`);

    return { success: true };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { success: false, error: 'Ошибка при отмене подписки' };
  }
}

// Рассчитать стоимость подписки
export async function calculateSubscriptionPrice(
  planId: string,
  usersCount: number,
  billingPeriod: BillingPeriod,
  discountPercent: number
) {
  try {
    const plan = await getSubscriptionPlan(planId);
    if (!plan) {
      return { success: false, error: 'План не найден' };
    }

    const price = calculatePrice(plan, usersCount, billingPeriod, discountPercent);
    return { success: true, data: price };
  } catch (error) {
    console.error('Error calculating price:', error);
    return { success: false, error: 'Ошибка при расчёте стоимости' };
  }
}

// Создать тарифный план
export async function createPlan(formData: FormData) {
  const supabase = createAdminClient();

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const basePriceMonthly = parseInt(formData.get('base_price_monthly') as string) || 0;
  const basePriceYearly = parseInt(formData.get('base_price_yearly') as string) || 0;
  const pricePerUserMonthly = parseInt(formData.get('price_per_user_monthly') as string) || 0;
  const pricePerUserYearly = parseInt(formData.get('price_per_user_yearly') as string) || 0;
  const usersIncluded = parseInt(formData.get('users_included') as string) || 1;
  const maxUsers = formData.get('max_users') ? parseInt(formData.get('max_users') as string) : null;
  const allowedModes = (formData.get('allowed_modes') as string)?.split(',').map(s => s.trim()) || ['finance'];

  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert({
        name,
        description,
        base_price_monthly: basePriceMonthly,
        base_price_yearly: basePriceYearly,
        price_per_user_monthly: pricePerUserMonthly,
        price_per_user_yearly: pricePerUserYearly,
        users_included: usersIncluded,
        max_users: maxUsers,
        allowed_modes: allowedModes,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/superadmin/plans');
    revalidatePath('/superadmin/billing');

    return { success: true, data };
  } catch (error) {
    console.error('Error creating plan:', error);
    return { success: false, error: 'Ошибка при создании тарифа' };
  }
}

// Обновить тарифный план
export async function updatePlan(formData: FormData) {
  const supabase = createAdminClient();

  const planId = formData.get('plan_id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const basePriceMonthly = parseInt(formData.get('base_price_monthly') as string) || 0;
  const basePriceYearly = parseInt(formData.get('base_price_yearly') as string) || 0;
  const pricePerUserMonthly = parseInt(formData.get('price_per_user_monthly') as string) || 0;
  const pricePerUserYearly = parseInt(formData.get('price_per_user_yearly') as string) || 0;
  const usersIncluded = parseInt(formData.get('users_included') as string) || 1;
  const maxUsers = formData.get('max_users') ? parseInt(formData.get('max_users') as string) : null;
  const allowedModes = (formData.get('allowed_modes') as string)?.split(',').map(s => s.trim()) || ['finance'];
  const isActive = formData.get('is_active') === 'true';

  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .update({
        name,
        description,
        base_price_monthly: basePriceMonthly,
        base_price_yearly: basePriceYearly,
        price_per_user_monthly: pricePerUserMonthly,
        price_per_user_yearly: pricePerUserYearly,
        users_included: usersIncluded,
        max_users: maxUsers,
        allowed_modes: allowedModes,
        is_active: isActive,
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/superadmin/plans');
    revalidatePath('/superadmin/billing');

    return { success: true, data };
  } catch (error) {
    console.error('Error updating plan:', error);
    return { success: false, error: 'Ошибка при обновлении тарифа' };
  }
}

// Переключить активность тарифа
export async function togglePlanActive(planId: string, isActive: boolean) {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ is_active: isActive })
      .eq('id', planId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/superadmin/plans');
    revalidatePath('/superadmin/billing');

    return { success: true };
  } catch (error) {
    console.error('Error toggling plan:', error);
    return { success: false, error: 'Ошибка при изменении статуса тарифа' };
  }
}

// Обновить режимы всех тарифов (только Тендеры)
export async function updateAllPlansModes() {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ allowed_modes: ['tenders'] })
      .eq('is_active', true);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/superadmin/plans');
    revalidatePath('/superadmin/billing');

    return { success: true };
  } catch (error) {
    console.error('Error updating plans modes:', error);
    return { success: false, error: 'Ошибка при обновлении режимов' };
  }
}

// =====================================================
// Переопределение цен для организации
// =====================================================

// Получить переопределение цен для организации
export async function getOrganizationPriceOverride(organizationId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('organization_price_overrides')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Error fetching price override:', error);
    return null;
  }

  return data;
}

// Сохранить переопределение цен для организации
export async function savePriceOverride(formData: FormData) {
  const supabase = createAdminClient();

  const organizationId = formData.get('organization_id') as string;
  
  // Парсим значения (пустая строка = null = использовать стандартную цену)
  const parsePrice = (value: FormDataEntryValue | null): number | null => {
    if (!value || value === '') return null;
    const num = parseFloat(value.toString());
    return isNaN(num) ? null : Math.round(num * 100); // конвертируем в копейки
  };

  const parseInt_ = (value: FormDataEntryValue | null): number | null => {
    if (!value || value === '') return null;
    const num = parseInt(value.toString());
    return isNaN(num) ? null : num;
  };

  const data = {
    organization_id: organizationId,
    base_price_monthly: parsePrice(formData.get('base_price_monthly')),
    base_price_yearly: parsePrice(formData.get('base_price_yearly')),
    price_per_user_monthly: parsePrice(formData.get('price_per_user_monthly')),
    price_per_user_yearly: parsePrice(formData.get('price_per_user_yearly')),
    users_included: parseInt_(formData.get('users_included')),
    max_users: parseInt_(formData.get('max_users')),
    notes: formData.get('notes') as string || null,
  };

  try {
    // Проверяем существует ли уже запись
    const { data: existing } = await supabase
      .from('organization_price_overrides')
      .select('id')
      .eq('organization_id', organizationId)
      .single();

    let result;
    if (existing) {
      // Обновляем
      result = await supabase
        .from('organization_price_overrides')
        .update(data)
        .eq('organization_id', organizationId)
        .select()
        .single();
    } else {
      // Создаём
      result = await supabase
        .from('organization_price_overrides')
        .insert(data)
        .select()
        .single();
    }

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    revalidatePath(`/superadmin/organizations/${organizationId}`);
    revalidatePath('/superadmin/billing');

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error saving price override:', error);
    return { success: false, error: 'Ошибка при сохранении индивидуальных цен' };
  }
}

// Удалить переопределение цен (вернуться к стандартным ценам)
export async function deletePriceOverride(organizationId: string) {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from('organization_price_overrides')
      .delete()
      .eq('organization_id', organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/superadmin/organizations/${organizationId}`);
    revalidatePath('/superadmin/billing');

    return { success: true };
  } catch (error) {
    console.error('Error deleting price override:', error);
    return { success: false, error: 'Ошибка при удалении индивидуальных цен' };
  }
}

// =====================================================
// Управление ценами тарифов
// =====================================================

// Обновить цены тарифа
export async function updatePlanPricing(formData: FormData) {
  const supabase = createAdminClient();

  const planId = formData.get('plan_id') as string;
  
  // Парсим цены из рублей в копейки
  const parsePrice = (value: FormDataEntryValue | null): number => {
    if (!value || value === '') return 0;
    const num = parseFloat(value.toString());
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const parseInt_ = (value: FormDataEntryValue | null): number | null => {
    if (!value || value === '') return null;
    const num = parseInt(value.toString());
    return isNaN(num) ? null : num;
  };

  const data = {
    base_price_monthly: parsePrice(formData.get('base_price_monthly')),
    base_price_yearly: parsePrice(formData.get('base_price_yearly')),
    price_per_user_monthly: parsePrice(formData.get('price_per_user_monthly')),
    price_per_user_yearly: parsePrice(formData.get('price_per_user_yearly')),
    users_included: parseInt_(formData.get('users_included')) || 1,
    max_users: parseInt_(formData.get('max_users')),
  };

  try {
    const { error } = await supabase
      .from('subscription_plans')
      .update(data)
      .eq('id', planId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/superadmin/pricing');
    revalidatePath('/superadmin/plans');
    revalidatePath('/superadmin/billing');

    return { success: true };
  } catch (error) {
    console.error('Error updating plan pricing:', error);
    return { success: false, error: 'Ошибка при обновлении цен' };
  }
}
