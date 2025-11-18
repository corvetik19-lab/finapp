import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

// GET /api/tenders/[id]/files/[fileId] - скачивание файла
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

    // Возвращаем файл
    return new NextResponse(fileData, {
      headers: {
        'Content-Type': fileRecord.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileRecord.file_name}"`,
        'Content-Length': fileRecord.file_size.toString(),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/[id]/files/[fileId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tenders/[id]/files/[fileId] - удаление файла
export async function DELETE(
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

    // Удаляем файл из Storage
    const { error: storageError } = await supabase.storage
      .from('tender-files')
      .remove([fileRecord.file_path]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
    }

    // Помечаем файл как удалённый в БД (мягкое удаление)
    const { error: deleteError } = await supabase
      .from('tender_attachments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', fileId);

    if (deleteError) {
      console.error('Error marking file as deleted:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/tenders/[id]/files/[fileId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
