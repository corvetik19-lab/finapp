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

    // Получаем системные этапы и этапы компании пользователя
    const { data: stages, error } = await supabase
      .from('tender_stages')
      .select('*')
      .order('category')
      .order('order_index');

    if (error) {
      console.error('Error fetching tender stages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tender stages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: stages,
      count: stages?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/stages:', error);
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
    const { name, category, color, is_final } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!category || !['tender_dept', 'realization', 'archive'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
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

    // Получаем максимальный order_index в этой категории
    const { data: maxStage } = await supabase
      .from('tender_stages')
      .select('order_index')
      .eq('company_id', profile.company_id)
      .eq('category', category)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const nextOrderIndex = (maxStage?.order_index || 0) + 1;

    // Создаем этап
    const { data: stage, error } = await supabase
      .from('tender_stages')
      .insert({
        name: name.trim(),
        category,
        color: color || '#3b82f6',
        is_final: is_final || false,
        order_index: nextOrderIndex,
        company_id: profile.company_id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tender stage:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to create tender stage', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: stage,
      message: 'Tender stage created successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/tenders/stages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
