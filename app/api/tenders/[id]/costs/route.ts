import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

// GET /api/tenders/[id]/costs - получение затрат
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRSCClient();
    const { id: tenderId } = await params;

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем затраты тендера
    const { data: costs, error } = await supabase
      .from('tender_costs')
      .select('*')
      .eq('tender_id', tenderId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching costs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(costs || []);
  } catch (error) {
    console.error('Error in GET /api/tenders/[id]/costs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenders/[id]/costs - создание затраты
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRSCClient();
    const { id: tenderId } = await params;

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { category, description, amount, date } = body;

    if (!category || !amount) {
      return NextResponse.json(
        { error: 'Category and amount are required' },
        { status: 400 }
      );
    }

    // Создаём затрату
    const { data: cost, error } = await supabase
      .from('tender_costs')
      .insert({
        tender_id: tenderId,
        category,
        description: description || null,
        amount, // уже в копейках
        date: date || new Date().toISOString().split('T')[0],
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating cost:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(cost, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tenders/[id]/costs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
