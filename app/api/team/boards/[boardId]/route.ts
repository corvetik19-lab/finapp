import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get board
    const { data: board, error: boardError } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('id', boardId)
      .single();

    if (boardError) {
      return NextResponse.json({ error: boardError.message }, { status: 500 });
    }

    // Get columns with cards
    const { data: columns, error: columnsError } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true });

    if (columnsError) {
      return NextResponse.json({ error: columnsError.message }, { status: 500 });
    }

    // Get cards for all columns
    const columnIds = columns?.map(c => c.id) || [];
    const { data: cards, error: cardsError } = await supabase
      .from('kanban_cards')
      .select('*')
      .in('column_id', columnIds)
      .order('position', { ascending: true });

    if (cardsError) {
      return NextResponse.json({ error: cardsError.message }, { status: 500 });
    }

    // Organize cards by column
    const columnsWithCards = columns?.map(col => ({
      ...col,
      cards: cards?.filter(card => card.column_id === col.id) || []
    })) || [];

    return NextResponse.json({
      ...board,
      columns: columnsWithCards
    });
  } catch (error) {
    console.error('Error in GET /api/team/boards/[boardId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { data: board, error } = await supabase
      .from('kanban_boards')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', boardId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error('Error in PATCH /api/team/boards/[boardId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('kanban_boards')
      .delete()
      .eq('id', boardId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/team/boards/[boardId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
