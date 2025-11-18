import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

// GET /api/tenders/[id]/files/[fileId]/view - просмотр файла (inline)
export async function GET(
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

    // Получаем метаданные файла
    const { data: fileRecord, error: dbError } = await supabase
      .from('tender_attachments')
      .select('*')
      .eq('id', fileId)
      .single();

    if (dbError || !fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Получаем файл из Storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('tender-files')
      .download(fileRecord.file_path);

    if (storageError || !fileData) {
      console.error('Error downloading file:', storageError);
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    // Возвращаем файл для просмотра (inline, не attachment)
    return new NextResponse(fileData, {
      headers: {
        'Content-Type': fileRecord.mime_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileRecord.file_name)}"`,
        'Content-Length': fileRecord.file_size.toString(),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/[id]/files/[fileId]/view:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
