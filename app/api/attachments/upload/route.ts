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
 * - transactionId: string (optional)
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
    const files = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File;
    const transactionId = formData.get('transactionId') as string;

    // Поддержка как одиночной, так и множественной загрузки
    const filesToUpload = files.length > 0 ? files : (singleFile ? [singleFile] : []);

    if (filesToUpload.length === 0) {
      return NextResponse.json(
        { error: 'Отсутствует файл' },
        { status: 400 }
      );
    }

    const uploadedAttachments = [];
    const errors = [];

    // Обрабатываем каждый файл
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];

      // Валидация размера
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Файл слишком большой. Максимум 10 МБ`);
        continue;
      }

      // Валидация типа
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Неподдерживаемый тип файла`);
        continue;
      }

      // Генерируем уникальное имя файла
      const timestamp = Date.now() + i; // Добавляем индекс для уникальности
      const fileExt = file.name.split('.').pop();
      // Если нет транзакции, сохраняем в общую папку receipts
      const folder = transactionId || 'receipts';
      const fileName = `${user.id}/${folder}/${timestamp}.${fileExt}`;

      try {
        // Конвертируем File в ArrayBuffer для Supabase Storage
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Загружаем в Supabase Storage
        const { error: uploadError } = await supabase
          .storage
          .from('attachments')
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          errors.push(`${file.name}: Ошибка загрузки в хранилище`);
          continue;
        }

        // Создаём запись в БД
        const { data: attachment, error: dbError } = await supabase
          .from('attachments')
          .insert({
            user_id: user.id,
            transaction_id: transactionId || null,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            file_path: fileName,
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database insert error:', dbError);
          
          // Удаляем файл из storage если не удалось записать в БД
          await supabase.storage.from('attachments').remove([fileName]);
          
          errors.push(`${file.name}: Ошибка сохранения в базу данных`);
          continue;
        }

        uploadedAttachments.push(attachment);
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        errors.push(`${file.name}: Ошибка обработки`);
      }
    }

    // Если привязано к транзакции, обновляем счётчик
    if (transactionId && uploadedAttachments.length > 0) {
      const { count } = await supabase
        .from('attachments')
        .select('id', { count: 'exact' })
        .eq('transaction_id', transactionId);

      await supabase
        .from('transactions')
        .update({ attachment_count: count || 0 })
        .eq('id', transactionId);
    }

    // Возвращаем результат
    if (uploadedAttachments.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: errors.length > 0 ? errors.join('; ') : 'Не удалось загрузить файлы'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      attachments: uploadedAttachments,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
