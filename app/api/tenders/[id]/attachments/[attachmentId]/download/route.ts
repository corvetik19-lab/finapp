import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function GET(
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
      .select('file_path, file_name, mime_type')
      .eq('id', attachmentId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Скачиваем файл из Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('tender-attachments')
      .download(attachment.file_path);

    if (downloadError || !fileData) {
      console.error('Error downloading file from storage:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download file' },
        { status: 500 }
      );
    }

    // Возвращаем файл
    return new NextResponse(fileData, {
      headers: {
        'Content-Type': attachment.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.file_name)}"`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/[id]/attachments/[attachmentId]/download:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
