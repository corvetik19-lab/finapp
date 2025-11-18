import { NextRequest, NextResponse } from 'next/server';
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

    // Получаем системные типы и типы компании пользователя
    const { data: types, error } = await supabase
      .from('tender_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching tender types:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tender types' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: types,
      count: types?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const { name, description } = body;

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

    // Создаем тип
    const { data: type, error } = await supabase
      .from('tender_types')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        company_id: profile.company_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tender type:', error);
      return NextResponse.json(
        { error: 'Failed to create tender type' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: type,
      message: 'Tender type created successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/tenders/types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
