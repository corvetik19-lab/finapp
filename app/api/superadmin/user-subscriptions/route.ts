import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { createUserSubscription } from '@/lib/billing/user-subscription-service';
import type { CreateUserSubscriptionInput } from '@/types/user-billing';

export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем роль super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    if (profile?.global_role !== 'super_admin') {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await req.json();
    const input: CreateUserSubscriptionInput = {
      user_id: body.user_id,
      plan_id: body.plan_id,
      mode: body.mode || 'finance',
      billing_period: body.billing_period || 'monthly',
      discount_percent: body.discount_percent || 0,
      trial_days: body.trial_days || 0,
      notes: body.notes,
    };

    if (!input.user_id || !input.plan_id) {
      return NextResponse.json(
        { error: 'Необходимо указать user_id и plan_id' },
        { status: 400 }
      );
    }

    const subscription = await createUserSubscription(input);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Не удалось создать подписку' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    console.error('Error creating user subscription:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
