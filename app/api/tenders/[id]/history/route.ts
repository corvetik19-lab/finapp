import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Получаем историю изменений этапов
    const { data: history, error } = await supabase
      .from('tender_stage_history')
      .select('*')
      .eq('tender_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tender history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tender history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: history,
      count: history?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/[id]/history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
