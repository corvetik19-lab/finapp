import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

// PATCH /api/tenders/[id]/files/[fileId]/comment - обновление комментария к файлу
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const supabase = await createRSCClient();
    const { fileId } = await params;

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { comment } = body;

    // Обновляем комментарий
    const { data: updatedFiles, error } = await supabase
      .from('tender_attachments')
      .update({ comment })
      .eq('id', fileId)
      .select();

    if (error) {
      console.error('Error updating comment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updatedFiles || updatedFiles.length === 0) {
      return NextResponse.json({ error: 'File not found or no permission' }, { status: 404 });
    }

    return NextResponse.json(updatedFiles[0], { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/tenders/[id]/files/[fileId]/comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
