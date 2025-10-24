import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/attachments/delete
 * 
 * Удаляет файл из Storage и БД
 * 
 * Body: { fileId: string, storagePath: string }
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

    const { fileId, storagePath } = await request.json();

    if (!fileId || !storagePath) {
      return NextResponse.json(
        { error: 'Missing fileId or storagePath' },
        { status: 400 }
      );
    }

    // Проверяем что файл принадлежит пользователю
    if (!storagePath.startsWith(user.id + '/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Получаем информацию о файле для проверки
    const { data: attachment } = await supabase
      .from('attachments')
      .select('transaction_id')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (!attachment) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Удаляем из Storage
    const { error: storageError } = await supabase
      .storage
      .from('attachments')
      .remove([storagePath]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Продолжаем даже если не удалось удалить из storage
    }

    // Удаляем из БД
    const { error: dbError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return NextResponse.json(
        { error: 'Failed to delete from database' },
        { status: 500 }
      );
    }

    // Обновляем счётчик вложений в транзакции
    const { count } = await supabase
      .from('attachments')
      .select('id', { count: 'exact' })
      .eq('transaction_id', attachment.transaction_id);

    await supabase
      .from('transactions')
      .update({ attachment_count: count || 0 })
      .eq('id', attachment.transaction_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
