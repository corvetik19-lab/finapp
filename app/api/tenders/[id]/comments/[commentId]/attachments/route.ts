import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
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

    const { id: tenderId, commentId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Проверка размера файла (макс 10 МБ)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10 MB' },
        { status: 400 }
      );
    }

    // Проверяем что комментарий принадлежит пользователю
    const { data: comment, error: commentError } = await supabase
      .from('tender_comments')
      .select('id')
      .eq('id', commentId)
      .eq('author_id', user.id)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found or access denied' },
        { status: 404 }
      );
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    // Очищаем имя файла от кириллицы и спецсимволов
    const sanitizedFileName = file.name
      .replace(/[а-яА-ЯёЁ]/g, '') // Убираем кириллицу
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Заменяем спецсимволы на _
      .replace(/_{2,}/g, '_') // Убираем множественные подчеркивания
      .replace(/^_|_$/g, ''); // Убираем подчеркивания в начале и конце
    const fileName = `tender-comments/${tenderId}/${commentId}/${timestamp}-${sanitizedFileName || 'file'}`;

    // Загружаем файл в Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tender-attachments')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    // Создаем запись в БД
    const { data: attachment, error: dbError } = await supabase
      .from('tender_comment_attachments')
      .insert({
        comment_id: commentId,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error creating attachment record:', dbError);
      // Удаляем файл из storage если не удалось создать запись
      await supabase.storage
        .from('tender-attachments')
        .remove([uploadData.path]);
      
      return NextResponse.json(
        { error: 'Failed to create attachment record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: attachment,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/tenders/[id]/comments/[commentId]/attachments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
