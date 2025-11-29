import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';
import { getTenderHistory } from '@/lib/tenders/service';

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

    // Используем сервисную функцию для получения полной истории (этапы + поля)
    const { data: history, error } = await getTenderHistory(id);

    if (error) {
      console.error('Error fetching tender history:', error);
      return NextResponse.json(
        { error: `Failed to fetch tender history: ${error}` },
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
