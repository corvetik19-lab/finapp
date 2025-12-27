import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { updateUserSubscription, cancelUserSubscription } from '@/lib/billing/user-subscription-service';
import type { UpdateUserSubscriptionInput } from '@/types/user-billing';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const input: UpdateUserSubscriptionInput = {};

    if (body.plan_id !== undefined) input.plan_id = body.plan_id;
    if (body.status !== undefined) input.status = body.status;
    if (body.billing_period !== undefined) input.billing_period = body.billing_period;
    if (body.discount_percent !== undefined) input.discount_percent = body.discount_percent;
    if (body.notes !== undefined) input.notes = body.notes;

    const subscription = await updateUserSubscription(id, input, user.id);

    if (!subscription) {
      return NextResponse.json(
        { error: 'Не удалось обновить подписку' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    console.error('Error updating user subscription:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const success = await cancelUserSubscription(id, user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Не удалось отменить подписку' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling user subscription:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
