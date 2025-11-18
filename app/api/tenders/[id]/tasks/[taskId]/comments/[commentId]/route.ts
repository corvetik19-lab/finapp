import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

// DELETE /api/tenders/[id]/tasks/[taskId]/comments/[commentId] - удаление комментария
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string; commentId: string }> }
) {
  try {
    const supabase = await createRSCClient();
    const { commentId } = await params;

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Удаляем комментарий (RLS политика проверит что это комментарий пользователя)
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id); // Дополнительная проверка на клиенте

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/tenders/[id]/tasks/[taskId]/comments/[commentId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
