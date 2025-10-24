import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

/**
 * POST /api/attachments/upload
 * 
 * Загружает файл в Supabase Storage и создаёт запись в БД
 * 
 * Body (FormData):
 * - file: File
 * - transactionId: string
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем данные из FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const transactionId = formData.get('transactionId') as string;

    if (!file || !transactionId) {
      return NextResponse.json(
        { error: 'Отсутствует файл или ID транзакции' },
        { status: 400 }
      );
    }

    // Валидация размера
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Файл слишком большой. Максимум 10 МБ' },
        { status: 400 }
      );
    }

    // Валидация типа
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Неподдерживаемый тип файла' },
        { status: 400 }
      );
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${transactionId}/${timestamp}.${fileExt}`;

    // Загружаем в Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('attachments')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Ошибка загрузки файла в хранилище' },
        { status: 500 }
      );
    }

    // Создаём запись в БД
    const { data: attachment, error: dbError } = await supabase
      .from('attachments')
      .insert({
        user_id: user.id,
        transaction_id: transactionId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: fileName,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      
      // Удаляем файл из storage если не удалось записать в БД
      await supabase.storage.from('attachments').remove([fileName]);
      
      return NextResponse.json(
        { error: 'Ошибка сохранения в базу данных' },
        { status: 500 }
      );
    }

    // Обновляем счётчик вложений в транзакции
    await supabase
      .from('transactions')
      .update({ attachment_count: (await supabase
        .from('attachments')
        .select('id', { count: 'exact' })
        .eq('transaction_id', transactionId)).count || 0 })
      .eq('id', transactionId);

    return NextResponse.json(attachment);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
