import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

// GET /api/tenders/[id]/files - получение файлов
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRSCClient();
    const { id: tenderId } = await params;

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем файлы
    const { data: files, error } = await supabase
      .from('tender_attachments')
      .select('*')
      .eq('tender_id', tenderId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching files:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Получаем имена пользователей для загрузивших файлы через SQL
    const uploaderIds = [...new Set(files?.map(f => f.uploaded_by).filter(Boolean))];
    
    let uploadersMap = new Map();
    if (uploaderIds.length > 0) {
      // Используем SQL запрос для получения данных пользователей
      const { data: usersData } = await supabase.rpc('get_users_info', {
        user_ids: uploaderIds
      });
      
      if (usersData) {
        uploadersMap = new Map(
          usersData.map((u: { id: string; raw_user_meta_data?: { full_name?: string }; email?: string }) => [
            u.id,
            u.raw_user_meta_data?.full_name || u.email?.split('@')[0] || 'Неизвестный'
          ])
        );
      }
    }

    // Добавляем имена пользователей к файлам
    const filesWithUploaders = (files || []).map(file => ({
      ...file,
      uploader_name: file.uploaded_by ? uploadersMap.get(file.uploaded_by) : null,
    }));

    return NextResponse.json(filesWithUploaders);
  } catch (error) {
    console.error('Error in GET /api/tenders/[id]/files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenders/[id]/files - загрузка файла
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRSCClient();
    const { id: tenderId } = await params;

    // Проверяем авторизацию
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'tender';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Генерируем уникальное имя файла (безопасное для Storage)
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || '';
    const safeFileName = `${timestamp}.${fileExtension}`;
    const filePath = `tenders/${tenderId}/${safeFileName}`;

    // Загружаем файл в Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tender-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // Сохраняем метаданные файла в БД
    const { data: fileRecord, error: dbError } = await supabase
      .from('tender_attachments')
      .insert({
        tender_id: tenderId,
        uploaded_by: user.id,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
        category: category,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving file metadata:', dbError);
      // Удаляем файл из storage если не удалось сохранить метаданные
      await supabase.storage.from('tender-files').remove([filePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(fileRecord, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tenders/[id]/files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
