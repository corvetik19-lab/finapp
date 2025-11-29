import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'employee-avatars';

/**
 * POST /api/employees/avatar - Загрузить аватар сотрудника
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const employeeId = formData.get('employeeId') as string;

    if (!file || !employeeId) {
      return NextResponse.json(
        { error: 'Файл и employeeId обязательны' },
        { status: 400 }
      );
    }

    // Проверяем что сотрудник существует
    const { data: employee } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('id', employeeId)
      .single();

    if (!employee) {
      return NextResponse.json(
        { error: 'Сотрудник не найден' },
        { status: 404 }
      );
    }

    // Генерируем уникальное имя файла
    const fileExt = file.name.split('.').pop();
    const fileName = `${employeeId}/${Date.now()}.${fileExt}`;

    // Загружаем файл в Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      
      // Если bucket не существует, пробуем создать
      if (uploadError.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Хранилище не настроено. Создайте bucket "employee-avatars" в Supabase Storage.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Ошибка загрузки файла' },
        { status: 500 }
      );
    }

    // Получаем публичный URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    // Обновляем запись сотрудника
    const { error: updateError } = await supabase
      .from('employees')
      .update({ avatar_url: publicUrl })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Ошибка обновления данных' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: publicUrl });

  } catch (error) {
    console.error('Error in POST /api/employees/avatar:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/employees/avatar - Удалить аватар сотрудника
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId обязателен' },
        { status: 400 }
      );
    }

    // Получаем текущий URL аватара
    const { data: employee } = await supabase
      .from('employees')
      .select('avatar_url')
      .eq('id', employeeId)
      .single();

    if (employee?.avatar_url) {
      // Извлекаем путь файла из URL
      const urlParts = employee.avatar_url.split(`${BUCKET_NAME}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Удаляем файл из Storage
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([filePath]);
      }
    }

    // Очищаем URL в записи сотрудника
    const { error: updateError } = await supabase
      .from('employees')
      .update({ avatar_url: null })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Ошибка обновления данных' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/employees/avatar:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
