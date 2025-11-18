import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

// GET /api/tenders/[id]/tasks/[taskId]/comments - получение комментариев
export async function GET(
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

    // Получаем комментарии задачи
    const { data: comments, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Получаем информацию о пользователях
    const { data: users } = await supabase.auth.admin.listUsers();
    
    const userMap = new Map(
      users?.users.map(u => [u.id, u.email?.split('@')[0] || 'Пользователь']) || []
    );

    // Форматируем данные
    const formattedComments = (comments || []).map(comment => ({
      id: comment.id,
      task_id: comment.task_id,
      user_id: comment.user_id,
      user_name: userMap.get(comment.user_id) || 'Пользователь',
      comment: comment.comment,
      created_at: comment.created_at,
    }));

    return NextResponse.json(formattedComments);
  } catch (error) {
    console.error('Error in GET /api/tenders/[id]/tasks/[taskId]/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenders/[id]/tasks/[taskId]/comments - создание комментария
export async function POST(
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
    const { comment } = body;

    if (!comment || !comment.trim()) {
      return NextResponse.json(
        { error: 'Comment is required' },
        { status: 400 }
      );
    }

    // Создаём комментарий
    const { data: newComment, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        comment: comment.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tenders/[id]/tasks/[taskId]/comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
