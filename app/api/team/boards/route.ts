import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, member_ids, company_id } = body;

    if (!name || !company_id) {
      return NextResponse.json({ error: 'Name and company_id are required' }, { status: 400 });
    }

    // Create board
    const { data: board, error: boardError } = await supabase
      .from('kanban_boards')
      .insert({
        company_id,
        name,
        description: description || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (boardError) {
      console.error('Error creating board:', boardError);
      return NextResponse.json({ error: boardError.message }, { status: 500 });
    }

    // Create default columns
    const defaultColumns = [
      { name: 'Бэклог', color: '#6b7280', position: 0 },
      { name: 'К выполнению', color: '#f59e0b', position: 1 },
      { name: 'В работе', color: '#3b82f6', position: 2 },
      { name: 'На проверке', color: '#8b5cf6', position: 3 },
      { name: 'Готово', color: '#22c55e', position: 4, is_done_column: true },
    ];

    await supabase
      .from('kanban_columns')
      .insert(defaultColumns.map(col => ({
        board_id: board.id,
        ...col,
      })));

    // Add creator as owner
    await supabase
      .from('kanban_board_members')
      .insert({
        board_id: board.id,
        user_id: user.id,
        role: 'owner',
        invited_by: user.id,
      });

    // Add other members
    if (member_ids && member_ids.length > 0) {
      const membersToInsert = member_ids
        .filter((id: string) => id !== user.id)
        .map((memberId: string) => ({
          board_id: board.id,
          user_id: memberId,
          role: 'editor',
          invited_by: user.id,
        }));

      if (membersToInsert.length > 0) {
        await supabase
          .from('kanban_board_members')
          .insert(membersToInsert);
      }
    }

    return NextResponse.json({ data: board });
  } catch (error) {
    console.error('Error in POST /api/team/boards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'company_id is required' }, { status: 400 });
    }

    const { data: boards, error } = await supabase
      .from('kanban_boards')
      .select(`
        *,
        members:kanban_board_members(count)
      `)
      .eq('company_id', companyId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: boards });
  } catch (error) {
    console.error('Error in GET /api/team/boards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
