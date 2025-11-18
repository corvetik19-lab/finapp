import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем правила автоматизации компании пользователя
    const { data: rules, error } = await supabase
      .from('tender_automation_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching automation rules:', error);
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
    }

    return NextResponse.json({ data: rules || [] });
  } catch (error) {
    console.error('Error in GET /api/tenders/settings/automation:', error);
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
    const { name, description, trigger_type, trigger_condition, action_type, action_params, is_active } = body;

    if (!name || !trigger_type || !action_type) {
      return NextResponse.json(
        { error: 'Name, trigger_type and action_type are required' },
        { status: 400 }
      );
    }

    // Создаем правило
    const { data: rule, error } = await supabase
      .from('tender_automation_rules')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        trigger_type,
        trigger_condition: trigger_condition || {},
        action_type,
        action_params: action_params || {},
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating automation rule:', error);
      return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
    }

    return NextResponse.json({ data: rule, message: 'Rule created successfully' });
  } catch (error) {
    console.error('Error in POST /api/tenders/settings/automation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
