import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

// PATCH /api/tenders/[id]/tasks/[taskId] - обновление задачи
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const supabase = await createRSCClient();
    const { taskId } = await params;

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Разрешённые поля для обновления
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.assignee !== undefined) updates.assignee = body.assignee;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    
    // Маппинг приоритета: medium -> normal
    if (body.priority !== undefined) {
      updates.priority = body.priority === 'medium' ? 'normal' : body.priority;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Обновляем задачу
    const { data: task, error } = await supabase
      .from('tender_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Маппинг приоритета обратно: normal -> medium
    const mappedTask = {
      ...task,
      priority: task.priority === 'normal' ? 'medium' : task.priority,
    };

    return NextResponse.json(mappedTask);
  } catch (error) {
    console.error('Error in PATCH /api/tenders/[id]/tasks/[taskId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tenders/[id]/tasks/[taskId] - удаление задачи
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const supabase = await createRSCClient();
    const { taskId } = await params;

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Удаляем задачу
    const { error } = await supabase
      .from('tender_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/tenders/[id]/tasks/[taskId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
