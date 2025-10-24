import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';
import { WIDGET_ORDER_KEY, DEFAULT_WIDGET_ORDER, type DashboardWidgetKey } from '@/lib/dashboard/preferences/shared';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/widget-order
 * 
 * Получает порядок виджетов для текущего пользователя
 */
export async function GET() {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем настройки из БД
    const { data, error } = await supabase
      .from('user_preferences')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', WIDGET_ORDER_KEY)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Failed to load widget order:', error);
      return NextResponse.json({ order: DEFAULT_WIDGET_ORDER });
    }

    if (!data) {
      return NextResponse.json({ order: DEFAULT_WIDGET_ORDER });
    }

    const order = (data.value as { order?: DashboardWidgetKey[] })?.order;
    
    if (!Array.isArray(order)) {
      return NextResponse.json({ order: DEFAULT_WIDGET_ORDER });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Widget order GET error:', error);
    return NextResponse.json({ order: DEFAULT_WIDGET_ORDER });
  }
}

/**
 * POST /api/dashboard/widget-order
 * 
 * Сохраняет порядок виджетов
 * 
 * Body: { order: DashboardWidgetKey[] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { order } = body;

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'Invalid order format' }, { status: 400 });
    }

    // Сохраняем в БД (upsert)
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        key: WIDGET_ORDER_KEY,
        value: { order },
      }, {
        onConflict: 'user_id,key',
      });

    if (error) {
      console.error('Failed to save widget order:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Widget order POST error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
