import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';
import { generateExcelReport } from '@/lib/export/excel-generator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export/excel
 * 
 * Генерирует и возвращает Excel отчёт
 * 
 * Query параметры:
 * - startDate (опционально): начальная дата в формате YYYY-MM-DD
 * - endDate (опционально): конечная дата в формате YYYY-MM-DD
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

    // Параметры из query
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    console.log('📊 Generating Excel report for user:', user.id);
    console.log('📅 Period:', startDate || 'all', '-', endDate || 'all');

    // Генерируем Excel
    const buffer = await generateExcelReport(supabase, {
      userId: user.id,
      startDate,
      endDate,
    });

    console.log('✅ Excel report generated:', buffer.length, 'bytes');

    // Формируем имя файла
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `finapp_report_${dateStr}.xlsx`;

    // Возвращаем файл (преобразуем Buffer в Uint8Array)
    return new NextResponse(Uint8Array.from(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('❌ Excel export error:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при генерации Excel отчёта',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
