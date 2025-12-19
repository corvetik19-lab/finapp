import { getSupabaseClient } from '@/lib/supabase/client';
import { createRSCClient } from '@/lib/supabase/helpers';
import type {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  KanbanCardComment,
  CreateKanbanBoardInput,
  CreateKanbanCardInput,
  BoardMemberRole,
} from './types';
import { logger } from "@/lib/logger";

// =====================================================
// ДОСКИ
// =====================================================

export async function getKanbanBoards(companyId: string): Promise<KanbanBoard[]> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from('kanban_boards')
    .select(`
      *,
      columns:kanban_columns(count),
      members:kanban_board_members(count)
    `)
    .eq('company_id', companyId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching kanban boards:', error);
    return [];
  }

  return data.map(board => ({
    ...board,
    members_count: board.members?.[0]?.count || 0,
  }));
}

export async function getKanbanBoard(boardId: string): Promise<KanbanBoard | null> {
  const supabase = await createRSCClient();
  
  const { data, error } = await supabase
    .from('kanban_boards')
    .select(`
      *,
      columns:kanban_columns(
        *,
        cards:kanban_cards(
          *,
          comments:kanban_card_comments(count)
        )
      ),
      members:kanban_board_members(*)
    `)
    .eq('id', boardId)
    .single();

  if (error) {
    logger.error('Error fetching kanban board:', error);
    return null;
  }

  const boardData = data as KanbanBoard & { columns?: (KanbanColumn & { cards?: KanbanCard[] })[] };

  // Sort columns and cards by position
  if (boardData.columns) {
    boardData.columns.sort((a, b) => a.position - b.position);
    boardData.columns.forEach((col) => {
      if (col.cards) {
        col.cards.sort((a, b) => a.position - b.position);
        col.cards = col.cards.filter((card) => !card.is_archived);
      }
    });
  }

  return boardData;
}

export async function createKanbanBoard(
  companyId: string,
  userId: string,
  input: CreateKanbanBoardInput
): Promise<KanbanBoard | null> {
  const supabase = getSupabaseClient();
  
  // Create board
  const { data: board, error: boardError } = await supabase
    .from('kanban_boards')
    .insert({
      company_id: companyId,
      name: input.name,
      description: input.description || null,
      background_color: input.background_color || '#f8fafc',
      is_template: input.is_template || false,
      created_by: userId,
    })
    .select()
    .single();

  if (boardError || !board) {
    logger.error('Error creating kanban board:', boardError);
    return null;
  }

  // Create default columns if not provided
  const columns = input.columns || [
    { name: 'Бэклог', color: '#6b7280' },
    { name: 'К выполнению', color: '#f59e0b' },
    { name: 'В работе', color: '#3b82f6' },
    { name: 'На проверке', color: '#8b5cf6' },
    { name: 'Готово', color: '#22c55e' },
  ];

  const columnsToInsert = columns.map((col, index) => ({
    board_id: board.id,
    name: col.name,
    position: index,
    color: col.color || '#6366f1',
    is_done_column: index === columns.length - 1,
  }));

  const { error: columnsError } = await supabase
    .from('kanban_columns')
    .insert(columnsToInsert);

  if (columnsError) {
    logger.error('Error creating kanban columns:', columnsError);
  }

  // Add creator as owner
  await supabase
    .from('kanban_board_members')
    .insert({
      board_id: board.id,
      user_id: userId,
      role: 'owner',
      invited_by: userId,
    });

  // Add other members if provided
  if (input.member_ids && input.member_ids.length > 0) {
    const membersToInsert = input.member_ids
      .filter(id => id !== userId)
      .map(memberId => ({
        board_id: board.id,
        user_id: memberId,
        role: 'editor' as BoardMemberRole,
        invited_by: userId,
      }));

    if (membersToInsert.length > 0) {
      await supabase
        .from('kanban_board_members')
        .insert(membersToInsert);
    }
  }

  return board;
}

export async function updateKanbanBoard(
  boardId: string,
  updates: Partial<Pick<KanbanBoard, 'name' | 'description' | 'background_color' | 'is_archived'>>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('kanban_boards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', boardId);

  if (error) {
    logger.error('Error updating kanban board:', error);
    return false;
  }

  return true;
}

export async function deleteKanbanBoard(boardId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('kanban_boards')
    .delete()
    .eq('id', boardId);

  if (error) {
    logger.error('Error deleting kanban board:', error);
    return false;
  }

  return true;
}

// =====================================================
// КОЛОНКИ
// =====================================================

export async function createKanbanColumn(
  boardId: string,
  name: string,
  color?: string
): Promise<KanbanColumn | null> {
  const supabase = getSupabaseClient();
  
  // Get max position
  const { data: maxPos } = await supabase
    .from('kanban_columns')
    .select('position')
    .eq('board_id', boardId)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = (maxPos?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('kanban_columns')
    .insert({
      board_id: boardId,
      name,
      position,
      color: color || '#6366f1',
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating kanban column:', error);
    return null;
  }

  return data;
}

export async function updateKanbanColumn(
  columnId: string,
  updates: Partial<Pick<KanbanColumn, 'name' | 'color' | 'wip_limit' | 'is_done_column'>>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('kanban_columns')
    .update(updates)
    .eq('id', columnId);

  if (error) {
    logger.error('Error updating kanban column:', error);
    return false;
  }

  return true;
}

export async function deleteKanbanColumn(columnId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('kanban_columns')
    .delete()
    .eq('id', columnId);

  if (error) {
    logger.error('Error deleting kanban column:', error);
    return false;
  }

  return true;
}

export async function reorderKanbanColumns(
  boardId: string,
  columnIds: string[]
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const updates = columnIds.map((id, index) => ({
    id,
    board_id: boardId,
    position: index,
  }));

  const { error } = await supabase
    .from('kanban_columns')
    .upsert(updates, { onConflict: 'id' });

  if (error) {
    logger.error('Error reordering kanban columns:', error);
    return false;
  }

  return true;
}

// =====================================================
// КАРТОЧКИ
// =====================================================

export async function createKanbanCard(
  userId: string,
  input: CreateKanbanCardInput
): Promise<KanbanCard | null> {
  const supabase = getSupabaseClient();
  
  // Get max position in column
  const { data: maxPos } = await supabase
    .from('kanban_cards')
    .select('position')
    .eq('column_id', input.column_id)
    .eq('is_archived', false)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = (maxPos?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from('kanban_cards')
    .insert({
      column_id: input.column_id,
      title: input.title,
      description: input.description || null,
      priority: input.priority || 'normal',
      assignee_ids: input.assignee_ids || [],
      due_date: input.due_date || null,
      labels: input.labels || [],
      tender_id: input.tender_id || null,
      estimated_hours: input.estimated_hours || null,
      position,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating kanban card:', error);
    return null;
  }

  return data;
}

export async function updateKanbanCard(
  cardId: string,
  updates: Partial<Omit<KanbanCard, 'id' | 'created_by' | 'created_at'>>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('kanban_cards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', cardId);

  if (error) {
    logger.error('Error updating kanban card:', error);
    return false;
  }

  return true;
}

export async function moveKanbanCard(
  cardId: string,
  targetColumnId: string,
  newPosition: number
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  // Get current card
  const { data: card } = await supabase
    .from('kanban_cards')
    .select('column_id, position')
    .eq('id', cardId)
    .single();

  if (!card) return false;

  const sameColumn = card.column_id === targetColumnId;

  // Update positions of other cards
  if (sameColumn) {
    // Moving within same column
    if (card.position < newPosition) {
      // Moving down
      await supabase.rpc('decrement_card_positions', {
        p_column_id: targetColumnId,
        p_start: card.position + 1,
        p_end: newPosition,
      });
    } else {
      // Moving up
      await supabase.rpc('increment_card_positions', {
        p_column_id: targetColumnId,
        p_start: newPosition,
        p_end: card.position - 1,
      });
    }
  } else {
    // Moving to different column
    // Decrement positions in source column
    await supabase
      .from('kanban_cards')
      .update({ position: supabase.rpc('position - 1') as unknown as number })
      .eq('column_id', card.column_id)
      .gt('position', card.position);

    // Increment positions in target column
    await supabase
      .from('kanban_cards')
      .update({ position: supabase.rpc('position + 1') as unknown as number })
      .eq('column_id', targetColumnId)
      .gte('position', newPosition);
  }

  // Update the card
  const { error } = await supabase
    .from('kanban_cards')
    .update({
      column_id: targetColumnId,
      position: newPosition,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId);

  if (error) {
    logger.error('Error moving kanban card:', error);
    return false;
  }

  return true;
}

export async function deleteKanbanCard(cardId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('kanban_cards')
    .delete()
    .eq('id', cardId);

  if (error) {
    logger.error('Error deleting kanban card:', error);
    return false;
  }

  return true;
}

export async function archiveKanbanCard(cardId: string): Promise<boolean> {
  return updateKanbanCard(cardId, { is_archived: true });
}

// =====================================================
// УЧАСТНИКИ ДОСКИ
// =====================================================

export async function addBoardMember(
  boardId: string,
  userId: string,
  role: BoardMemberRole,
  invitedBy: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('kanban_board_members')
    .insert({
      board_id: boardId,
      user_id: userId,
      role,
      invited_by: invitedBy,
    });

  if (error) {
    logger.error('Error adding board member:', error);
    return false;
  }

  return true;
}

export async function updateBoardMemberRole(
  boardId: string,
  userId: string,
  role: BoardMemberRole
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('kanban_board_members')
    .update({ role })
    .eq('board_id', boardId)
    .eq('user_id', userId);

  if (error) {
    logger.error('Error updating board member role:', error);
    return false;
  }

  return true;
}

export async function removeBoardMember(
  boardId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('kanban_board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('user_id', userId);

  if (error) {
    logger.error('Error removing board member:', error);
    return false;
  }

  return true;
}

// =====================================================
// КОММЕНТАРИИ
// =====================================================

export async function getCardComments(cardId: string): Promise<KanbanCardComment[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('kanban_card_comments')
    .select('*')
    .eq('card_id', cardId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Error fetching card comments:', error);
    return [];
  }

  return (data as KanbanCardComment[]) || [];
}

export async function addCardComment(
  cardId: string,
  userId: string,
  content: string
): Promise<KanbanCardComment | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('kanban_card_comments')
    .insert({
      card_id: cardId,
      user_id: userId,
      content,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error adding card comment:', error);
    return null;
  }

  return data;
}

export async function deleteCardComment(commentId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('kanban_card_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    logger.error('Error deleting card comment:', error);
    return false;
  }

  return true;
}
