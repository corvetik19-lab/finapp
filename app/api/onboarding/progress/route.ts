import { NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/onboarding/progress
 * 
 * Возвращает прогресс onboarding для текущего пользователя
 * 
 * Response: {
 *   accounts: number,
 *   transactions: number,
 *   categories: number,
 *   budgets: number,
 *   ai_messages: number
 * }
 */
export async function GET() {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Параллельно получаем счётчики из разных таблиц
    const [accountsRes, transactionsRes, categoriesRes, budgetsRes, aiMessagesRes] = 
      await Promise.all([
        // Количество активных счетов
        supabase
          .from('accounts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('deleted_at', null),

        // Количество транзакций
        supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),

        // Количество категорий (созданных пользователем)
        supabase
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('deleted_at', null),

        // Количество бюджетов
        supabase
          .from('budgets')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),

        // Количество сообщений в AI чате
        supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('role', 'user'), // Только сообщения пользователя
      ]);

    const progress = {
      accounts: accountsRes.count || 0,
      transactions: transactionsRes.count || 0,
      categories: categoriesRes.count || 0,
      budgets: budgetsRes.count || 0,
      ai_messages: aiMessagesRes.count || 0,
    };

    // Логируем для отладки
    console.log('📊 Onboarding progress for', user.id, ':', progress);

    return NextResponse.json(progress);
  } catch (error) {
    console.error('❌ Onboarding progress error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get onboarding progress',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
