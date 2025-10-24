import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/attachments/view?path=...
 * 
 * Возвращает файл для просмотра
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const path = request.nextUrl.searchParams.get('path');
    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    // Проверяем что файл принадлежит пользователю
    if (!path.startsWith(user.id + '/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Получаем файл из Storage
    const { data, error } = await supabase
      .storage
      .from('attachments')
      .download(path);

    if (error || !data) {
      console.error('Storage download error:', error);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Определяем Content-Type
    const contentType = data.type || 'application/octet-stream';

    // Возвращаем файл
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('View error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
