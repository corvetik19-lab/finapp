import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseCommand,
  formatBalanceResponse,
  formatStatsResponse,
  formatTransactionConfirmation,
  type TransactionCommand
} from '@/lib/ai/command-parser';

export const dynamic = 'force-dynamic';

/**
 * POST /api/chat/execute-command
 * 
 * Выполняет распознанную команду пользователя
 * 
 * Body: { command: string }
 * Response: { success: boolean, message: string, data?: any }
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

    const body = await request.json();
    const { command } = body;

    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { error: 'Command is required' },
        { status: 400 }
      );
    }

    console.log('🎯 Parsing command:', command);

    // Парсим команду
    const parsed = parseCommand(command);
    console.log('📋 Parsed:', parsed);

    // Выполняем команду в зависимости от типа
    switch (parsed.type) {
      case 'add_transaction': {
        const result = await handleAddTransaction(
          supabase,
          user.id,
          parsed.data as TransactionCommand
        );
        return NextResponse.json(result);
      }

      case 'show_balance': {
        const result = await handleShowBalance(supabase, user.id);
        return NextResponse.json(result);
      }

      case 'show_stats': {
        const result = await handleShowStats(
          supabase,
          user.id,
          parsed.data?.category
        );
        return NextResponse.json(result);
      }

      case 'unknown':
      default: {
        // Команда не распознана, передаём в обычный AI чат
        return NextResponse.json({
          success: false,
          message: 'Команда не распознана. Попробуйте переформулировать или задайте вопрос AI.',
          isUnknown: true
        });
      }
    }
  } catch (error) {
    console.error('❌ Execute command error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Ошибка при выполнении команды',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Обработка команды добавления транзакции
 */
async function handleAddTransaction(
  supabase: SupabaseClient,
  userId: string,
  transaction: TransactionCommand
) {
  try {
    // Получаем первый активный счёт пользователя
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .limit(1);

    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        message: '❌ У вас нет активных счетов. Создайте счёт в разделе "Карты".'
      };
    }

    const account = accounts[0];

    // Получаем или создаём категорию
    let categoryId: string | null = null;

    if (transaction.category) {
      // Ищем категорию по имени
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('type', transaction.type === 'income' ? 'income' : 'expense')
        .ilike('name', transaction.category)
        .limit(1);

      if (categories && categories.length > 0) {
        categoryId = categories[0].id;
      } else {
        // Создаём новую категорию
        const { data: newCategory } = await supabase
          .from('categories')
          .insert({
            user_id: userId,
            name: transaction.category,
            type: transaction.type === 'income' ? 'income' : 'expense',
            icon: transaction.type === 'income' ? '💰' : '💸',
            color: transaction.type === 'income' ? '#10b981' : '#ef4444'
          })
          .select('id')
          .single();

        if (newCategory) {
          categoryId = newCategory.id;
        }
      }
    }

    // Создаём транзакцию
    const amount = transaction.type === 'expense' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);
    
    const { data: newTransaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: account.id,
        category_id: categoryId,
        amount,
        direction: transaction.type === 'income' ? 'income' : 'expense',
        description: transaction.description || (transaction.type === 'income' ? 'Доход' : 'Расход'),
        occurred_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return {
        success: false,
        message: '❌ Ошибка при создании транзакции: ' + error.message
      };
    }

    // Обновляем баланс счёта
    const { error: updateError } = await supabase.rpc('update_account_balance', {
      p_account_id: account.id
    });

    if (updateError) {
      console.error('Balance update error:', updateError);
    }

    console.log('✅ Transaction created:', newTransaction);

    return {
      success: true,
      message: formatTransactionConfirmation(transaction),
      data: {
        transaction: newTransaction,
        account: account.name
      }
    };
  } catch (error) {
    console.error('Add transaction error:', error);
    return {
      success: false,
      message: '❌ Ошибка при создании транзакции'
    };
  }
}

/**
 * Обработка команды показа баланса
 */
async function handleShowBalance(supabase: SupabaseClient, userId: string) {
  try {
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, name, balance, currency')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return {
        success: false,
        message: '❌ Ошибка при получении балансов'
      };
    }

    const message = formatBalanceResponse(accounts || []);

    return {
      success: true,
      message,
      data: {
        accounts: accounts || []
      }
    };
  } catch (error) {
    console.error('Show balance error:', error);
    return {
      success: false,
      message: '❌ Ошибка при получении балансов'
    };
  }
}

/**
 * Обработка команды статистики
 */
async function handleShowStats(
  supabase: SupabaseClient,
  userId: string,
  category?: string
) {
  try {
    // Период - текущий месяц
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let query = supabase
      .from('transactions')
      .select('id, amount, direction, categories(name)')
      .eq('user_id', userId)
      .eq('direction', 'expense')
      .gte('occurred_at', startOfMonth.toISOString())
      .lte('occurred_at', endOfMonth.toISOString());

    // Если указана категория, фильтруем
    if (category) {
      // Ищем категорию
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', userId)
        .ilike('name', `%${category}%`)
        .limit(1);

      if (categories && categories.length > 0) {
        query = query.eq('category_id', categories[0].id);
        category = categories[0].name; // Используем точное имя
      } else {
        return {
          success: false,
          message: `❌ Категория "${category}" не найдена`
        };
      }
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return {
        success: false,
        message: '❌ Ошибка при получении статистики'
      };
    }

    const total = Math.abs(
      (transactions || []).reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)
    );
    const count = transactions?.length || 0;

    const message = formatStatsResponse(category, total, count, 'текущий месяц');

    return {
      success: true,
      message,
      data: {
        category,
        amount: total,
        count,
        period: 'month'
      }
    };
  } catch (error) {
    console.error('Show stats error:', error);
    return {
      success: false,
      message: '❌ Ошибка при получении статистики'
    };
  }
}
