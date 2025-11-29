import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

const NOTIFICATION_TYPE_ICONS: Record<string, string> = {
  new_employee: '👤',
  status_change: '🔄',
  role_change: '🎭',
  absence_request: '📅',
  absence_approved: '✅',
  invitation_accepted: '🎉',
  birthday: '🎂',
  anniversary: '🏆'
};

/**
 * GET /api/employees/notifications - Получить уведомления
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    let query = supabase
      .from('employee_notifications')
      .select(`
        *,
        employee:employees(id, full_name, avatar_url)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Ошибка получения уведомлений' }, { status: 500 });
    }

    // Добавляем иконки
    const result = (data || []).map(n => ({
      ...n,
      icon: NOTIFICATION_TYPE_ICONS[n.type] || '📢'
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/employees/notifications:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/employees/notifications - Создать уведомление
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { company_id, user_ids, type, title, message, employee_id, related_id } = body;

    if (!company_id || !user_ids || !type || !title || !message) {
      return NextResponse.json({ 
        error: 'company_id, user_ids, type, title и message обязательны' 
      }, { status: 400 });
    }

    // Создаём уведомления для всех указанных пользователей
    const notifications = user_ids.map((uid: string) => ({
      company_id,
      user_id: uid,
      type,
      title,
      message,
      employee_id: employee_id || null,
      related_id: related_id || null
    }));

    const { data, error } = await supabase
      .from('employee_notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error creating notifications:', error);
      return NextResponse.json({ error: 'Ошибка создания уведомлений' }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data?.length || 0 });
  } catch (error) {
    console.error('Error in POST /api/employees/notifications:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * PATCH /api/employees/notifications - Отметить уведомления прочитанными
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, markAll } = body;

    if (markAll) {
      // Отметить все как прочитанные
      const { error } = await supabase
        .from('employee_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
      }
    } else if (ids && ids.length > 0) {
      // Отметить конкретные уведомления
      const { error } = await supabase
        .from('employee_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .in('id', ids);

      if (error) {
        console.error('Error marking as read:', error);
        return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/employees/notifications:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * DELETE /api/employees/notifications - Удалить уведомление
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id обязателен' }, { status: 400 });
    }

    const { error } = await supabase
      .from('employee_notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/employees/notifications:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
