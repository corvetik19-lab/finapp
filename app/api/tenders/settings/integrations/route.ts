import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем настройки интеграций
    const { data: integrations, error } = await supabase
      .from('tender_integrations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching integrations:', error);
      return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
    }

    return NextResponse.json({ data: integrations || [] });
  } catch (error) {
    console.error('Error in GET /api/tenders/settings/integrations:', error);
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
    const { integration_type, config, is_active } = body;

    if (!integration_type) {
      return NextResponse.json(
        { error: 'Integration type is required' },
        { status: 400 }
      );
    }

    // Upsert интеграции
    const { data: integration, error } = await supabase
      .from('tender_integrations')
      .upsert({
        integration_type,
        config: config || {},
        is_active: is_active ?? false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving integration:', error);
      return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 });
    }

    return NextResponse.json({ data: integration, message: 'Integration saved successfully' });
  } catch (error) {
    console.error('Error in POST /api/tenders/settings/integrations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
