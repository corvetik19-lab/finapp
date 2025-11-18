import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Получаем вложения
    const { data: attachments, error } = await supabase
      .from('tender_attachments')
      .select('*')
      .eq('tender_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tender attachments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tender attachments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: attachments,
      count: attachments?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/tenders/[id]/attachments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: tenderId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('document_type') as string;

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

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const fileName = `${tenderId}/${timestamp}-${file.name}`;

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
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Создаем запись в БД
    const { data: attachment, error: dbError } = await supabase
      .from('tender_attachments')
      .insert({
        tender_id: tenderId,
        uploaded_by: user.id,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
        document_type: documentType || 'other',
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
    console.error('Error in POST /api/tenders/[id]/attachments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
