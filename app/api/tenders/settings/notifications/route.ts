import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем настройки уведомлений пользователя
    const { data: settings, error } = await supabase
      .from('tender_notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Если настроек нет, возвращаем дефолтные
    if (!settings) {
      return NextResponse.json({
        data: {
          deadline_reminder: true,
          stage_change: true,
          new_tender: false,
          document_expiry: true,
          email_notifications: true,
          telegram_notifications: false,
          allow_backward_movement: false,
        },
      });
    }

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error('Error in GET /api/tenders/settings/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Upsert настроек
    const { data: settings, error } = await supabase
      .from('tender_notification_settings')
      .upsert({
        user_id: user.id,
        deadline_reminder: body.deadline_reminder ?? true,
        stage_change: body.stage_change ?? true,
        new_tender: body.new_tender ?? false,
        document_expiry: body.document_expiry ?? true,
        email_notifications: body.email_notifications ?? true,
        telegram_notifications: body.telegram_notifications ?? false,
        allow_backward_movement: body.allow_backward_movement ?? false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving notification settings:', error);
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ data: settings, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error in POST /api/tenders/settings/notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
