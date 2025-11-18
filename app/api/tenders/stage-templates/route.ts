import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Получаем company_id пользователя
    const { data: profile } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'User is not a member of any company' },
        { status: 403 }
      );
    }

    // Получаем шаблоны компании
    const { data: templates, error } = await supabase
      .from('tender_stage_templates')
      .select(`
        id,
        name,
        description,
        icon,
        is_active,
        is_system,
        created_at,
        updated_at,
        company_id,
        items:tender_stage_template_items(
          id,
          stage_id,
          order_index,
          stage:tender_stages(
            id,
            name,
            category,
            color,
            order_index,
            is_final,
            is_system,
            is_hidden,
            is_active,
            created_at,
            updated_at
          )
        )
      `)
      .eq('company_id', profile.company_id)
      .order('name');

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: templates,
      count: templates?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/stage-templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, icon, stage_ids } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Получаем company_id пользователя
    const { data: profile } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'User is not a member of any company' },
        { status: 403 }
      );
    }

    // Создаем шаблон
    const { data: template, error: templateError } = await supabase
      .from('tender_stage_templates')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || '📋',
        company_id: profile.company_id,
        is_active: true,
      })
      .select()
      .single();

    if (templateError) {
      console.error('Error creating template:', templateError);
      return NextResponse.json(
        { error: 'Failed to create template', details: templateError.message },
        { status: 500 }
      );
    }

    // Добавляем этапы если указаны
    if (stage_ids && Array.isArray(stage_ids) && stage_ids.length > 0) {
      const items = stage_ids.map((stage_id: string, index: number) => ({
        template_id: template.id,
        stage_id,
        order_index: index + 1,
      }));

      const { error: itemsError } = await supabase
        .from('tender_stage_template_items')
        .insert(items);

      if (itemsError) {
        console.error('Error creating template items:', itemsError);
        // Удаляем созданный шаблон если не удалось добавить этапы
        await supabase
          .from('tender_stage_templates')
          .delete()
          .eq('id', template.id);
        
        return NextResponse.json(
          { error: 'Failed to create template items' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      data: template,
      message: 'Template created successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/tenders/stage-templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
