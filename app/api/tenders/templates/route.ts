import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем шаблоны
    const { data: templates, error } = await supabase
      .from('tender_templates')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ data: templates || [] });
  } catch (error) {
    console.error('Error in GET /api/tenders/templates:', error);
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
    const { name, description, template_type, content } = body;

    if (!name || !template_type) {
      return NextResponse.json(
        { error: 'Name and template_type are required' },
        { status: 400 }
      );
    }

    // Создаем шаблон
    const { data: template, error } = await supabase
      .from('tender_templates')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        template_type,
        content: content || '',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ data: template, message: 'Template created successfully' });
  } catch (error) {
    console.error('Error in POST /api/tenders/templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
