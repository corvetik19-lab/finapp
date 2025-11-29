import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron Job для автоматического удаления устаревших тендеров.
 * 
 * Удаляет тендеры на предконтрактных этапах (tender_dept),
 * у которых срок подачи истёк более 30 дней назад.
 * 
 * Запускается автоматически через Vercel Cron или вручную.
 */
export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию для cron-запросов
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Если установлен CRON_SECRET, проверяем его
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Используем service role для обхода RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Получаем параметр days из query string (по умолчанию 30)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Вызываем функцию очистки
    const { data, error } = await adminClient.rpc('cleanup_stale_tenders', {
      days_threshold: days
    });

    if (error) {
      console.error('Error cleaning up stale tenders:', error);
      return NextResponse.json(
        { error: 'Failed to cleanup stale tenders', details: error.message },
        { status: 500 }
      );
    }

    const result = data?.[0] || { deleted_count: 0, deleted_ids: [] };

    console.log(`Cleanup completed: ${result.deleted_count} tenders deleted`);

    return NextResponse.json({
      success: true,
      message: `Удалено ${result.deleted_count} устаревших тендеров`,
      deleted_count: result.deleted_count,
      deleted_ids: result.deleted_ids || [],
      threshold_days: days,
      executed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in cleanup-stale-tenders cron:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
