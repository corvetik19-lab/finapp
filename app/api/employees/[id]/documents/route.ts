import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: 'Паспорт',
  contract: 'Договор',
  certificate: 'Сертификат',
  diploma: 'Диплом',
  medical: 'Медицинская справка',
  other: 'Другое'
};

/**
 * GET /api/employees/[id]/documents - Получить документы сотрудника
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json({ error: 'Ошибка получения документов' }, { status: 500 });
    }

    // Добавляем лейблы типов
    const documentsWithLabels = (data || []).map(doc => ({
      ...doc,
      type_label: DOCUMENT_TYPE_LABELS[doc.type] || doc.type
    }));

    return NextResponse.json(documentsWithLabels);
  } catch (error) {
    console.error('Error in GET /api/employees/[id]/documents:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/employees/[id]/documents - Загрузить документ
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const notes = formData.get('notes') as string | null;
    const expiresAt = formData.get('expires_at') as string | null;

    if (!file || !name || !type) {
      return NextResponse.json({ error: 'Файл, название и тип обязательны' }, { status: 400 });
    }

    // Получаем company_id сотрудника
    const { data: employee } = await supabase
      .from('employees')
      .select('company_id')
      .eq('id', id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
    }

    // Загружаем файл в Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('employee-documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 });
    }

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('employee-documents')
      .getPublicUrl(fileName);

    // Сохраняем запись в БД
    const { data, error } = await supabase
      .from('employee_documents')
      .insert({
        employee_id: id,
        company_id: employee.company_id,
        name,
        type,
        file_path: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        expires_at: expiresAt || null,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving document:', error);
      return NextResponse.json({ error: 'Ошибка сохранения документа' }, { status: 500 });
    }

    return NextResponse.json({
      ...data,
      type_label: DOCUMENT_TYPE_LABELS[data.type] || data.type
    });
  } catch (error) {
    console.error('Error in POST /api/employees/[id]/documents:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * DELETE /api/employees/[id]/documents - Удалить документ
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createRouteClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'documentId обязателен' }, { status: 400 });
    }

    // Получаем документ
    const { data: doc } = await supabase
      .from('employee_documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('employee_id', id)
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
    }

    // Удаляем файл из Storage
    const filePath = doc.file_path.split('/employee-documents/')[1];
    if (filePath) {
      await supabase.storage.from('employee-documents').remove([filePath]);
    }

    // Удаляем запись из БД
    const { error } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      console.error('Error deleting document:', error);
      return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/employees/[id]/documents:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
