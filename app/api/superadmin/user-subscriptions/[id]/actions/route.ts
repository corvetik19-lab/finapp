import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';
import { 
  renewUserSubscription, 
  suspendUserSubscription,
  resumeUserSubscription,
  deleteUserSubscription,
  cancelUserSubscription 
} from '@/lib/billing/user-subscription-service';

export async function POST(
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
    const { action, reason } = body;

    let result;
    
    switch (action) {
      case 'renew':
        result = await renewUserSubscription(id, user.id);
        if (!result) {
          return NextResponse.json({ error: 'Не удалось продлить подписку' }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: result, message: 'Подписка продлена' });
        
      case 'suspend':
        result = await suspendUserSubscription(id, reason, user.id);
        if (!result) {
          return NextResponse.json({ error: 'Не удалось приостановить подписку' }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: result, message: 'Подписка приостановлена' });
        
      case 'resume':
        result = await resumeUserSubscription(id, user.id);
        if (!result) {
          return NextResponse.json({ error: 'Не удалось возобновить подписку' }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: result, message: 'Подписка возобновлена' });
        
      case 'cancel': {
        const cancelled = await cancelUserSubscription(id, user.id);
        if (!cancelled) {
          return NextResponse.json({ error: 'Не удалось отменить подписку' }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: 'Подписка отменена' });
      }
        
      case 'delete': {
        const deleted = await deleteUserSubscription(id, user.id);
        if (!deleted) {
          return NextResponse.json({ error: 'Не удалось удалить подписку' }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: 'Подписка удалена' });
      }
        
      default:
        return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error performing subscription action:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
