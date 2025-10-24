import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';
import { generatePDFReport } from '@/lib/export/pdf-generator';

export const dynamic = 'force-dynamic';

interface TransactionRow {
  id: string;
  occurred_at: string;
  amount: number;
  direction: string;
  categories: { name: string }[] | null;
}

interface AccountRow {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

interface BudgetRow {
  id: string;
  limit_amount: number;
  categories: { name: string }[] | null;
}

/**
 * GET /api/export/pdf
 * 
 * Генерирует и возвращает PDF отчёт
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
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Период по умолчанию - последние 30 дней
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log('📄 Generating PDF report for user:', user.id);
    console.log('📅 Period:', startDate.toISOString(), '-', endDate.toISOString());

    // Получаем данные
    const [transactionsRes, accountsRes, budgetsRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, occurred_at, amount, direction, categories(name)')
        .eq('user_id', user.id)
        .gte('occurred_at', startDate.toISOString())
        .lte('occurred_at', endDate.toISOString())
        .order('occurred_at', { ascending: false })
        .limit(100),
      
      supabase
        .from('accounts')
        .select('id, name, balance, currency')
        .eq('user_id', user.id)
        .is('deleted_at', null),
      
      supabase
        .from('budgets')
        .select('id, limit_amount, categories(name)')
        .eq('user_id', user.id)
    ]);

    const transactions = (transactionsRes.data || []).map((t: TransactionRow) => ({
      id: t.id,
      date: new Date(t.occurred_at).toLocaleDateString('ru-RU'),
      occurred_at: t.occurred_at,
      amount: t.amount,
      direction: t.direction,
      categories: t.categories && t.categories.length > 0 ? t.categories[0] : null,
    }));

    const accounts = (accountsRes.data || []).map((a: AccountRow) => ({
      id: a.id,
      name: a.name,
      balance: a.balance,
      currency: a.currency || 'RUB',
    }));

    const budgets = (budgetsRes.data || []).map((b: BudgetRow) => ({
      id: b.id,
      amount: b.limit_amount,
      categories: b.categories && b.categories.length > 0 ? b.categories[0] : null,
    }));

    // Генерируем PDF
    const pdfBuffer = await generatePDFReport({
      user: {
        email: user.email || 'unknown',
        name: user.user_metadata?.full_name || user.email || 'Пользователь',
      },
      period: {
        start: startDate,
        end: endDate,
        label: `${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`,
      },
      transactions,
      accounts,
      budgets,
      options: {
        includeCharts: false,
        includeAccounts: true,
        includeBudgets: true,
        includeCategories: true,
        includeTransactions: true,
      },
    });

    console.log('✅ PDF report generated:', pdfBuffer.length, 'bytes');

    // Формируем имя файла
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `finapp_report_${dateStr}.pdf`;

    // Возвращаем файл (преобразуем Buffer в Uint8Array)
    return new NextResponse(Uint8Array.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('❌ PDF export error:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при генерации PDF отчёта',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
