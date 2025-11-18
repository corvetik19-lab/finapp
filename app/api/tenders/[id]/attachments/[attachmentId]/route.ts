import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
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

    const { attachmentId } = await params;

    // Получаем информацию о вложении
    const { data: attachment, error: fetchError } = await supabase
      .from('tender_attachments')
      .select('file_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Удаляем файл из Storage
    const { error: storageError } = await supabase.storage
      .from('tender-attachments')
      .remove([attachment.file_path]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
    }

    // Мягкое удаление записи в БД
    const { error: dbError } = await supabase
      .from('tender_attachments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', attachmentId);

    if (dbError) {
      console.error('Error deleting attachment record:', dbError);
      return NextResponse.json(
        { error: 'Failed to delete attachment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/tenders/[id]/attachments/[attachmentId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
