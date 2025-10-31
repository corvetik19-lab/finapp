import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function normalizeCategory(
  rawCategory: unknown,
  shopName?: string,
  items?: Array<{ name?: string }>,
): string {
  const tryParse = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const sanitizeLine = (text: string) =>
    text
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim())
      .find(
        (line) =>
          line &&
          !/^(?:пожалуйста|пришлите|понял|жду|provide|send)/i.test(line),
      );

  let candidate: string | undefined;

  if (rawCategory && typeof rawCategory === 'object') {
    const obj = rawCategory as Record<string, unknown>;
    if (typeof obj.output === 'string') {
      candidate = obj.output;
    } else if (typeof obj.category === 'string') {
      candidate = obj.category;
    }
  }

  if (!candidate && typeof rawCategory === 'string') {
    const trimmed = rawCategory.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      const parsed = tryParse(trimmed);
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (typeof obj.output === 'string') {
          candidate = obj.output;
        } else if (typeof obj.category === 'string') {
          candidate = obj.category;
        }
      }
    }

    if (!candidate) {
      candidate = trimmed;
    }
  }

  if (candidate) {
    candidate = candidate.replace(/^\s*['"]|['"]\s*$/g, '').trim();
  }

  const firstMeaningfulLine = candidate ? sanitizeLine(candidate) : undefined;

  let finalCategory = (firstMeaningfulLine ?? candidate ?? '').trim();

  const lowerShop = (shopName || '').toLowerCase();
  const itemsText = Array.isArray(items)
    ? items.map((item) => (item?.name || '').toLowerCase()).join(' ')
    : '';

  const shouldBeCharging =
    /айти\s*чардж|aiti|aiticharge|iticharge/i.test(
      `${lowerShop} ${itemsText}`,
    ) || /зарядк|электромобил|charging/i.test(itemsText);

  if (shouldBeCharging) {
    finalCategory = 'Зарядка электромобиля';
  }

  if (!finalCategory || /пожалуйста|пришлите|понял/i.test(finalCategory)) {
    finalCategory = shouldBeCharging ? 'Зарядка электромобиля' : '';
  }

  if (!finalCategory) {
    finalCategory = 'Прочее';
  }

  return finalCategory;
}

export async function POST(req: NextRequest) {
  try {
    // Проверка API ключа
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.N8N_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем user_id из headers (n8n должен передавать)
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { shop_name, date, items, category } = body;

    // Валидация
    if (!shop_name || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Категория приходит из n8n (уже определена AI)
    const mainCategory = normalizeCategory(category, shop_name, items);
    console.log('Category from n8n:', mainCategory);

    // Найти или создать категорию
    let categoryId: string | null = null;
    
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', mainCategory)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const { data: newCategory } = await supabase
        .from('categories')
        .insert({
          name: mainCategory,
          kind: 'expense',
          user_id: userId,
        })
        .select('id')
        .single();
      
      if (newCategory) {
        categoryId = newCategory.id;
      }
    }

    // Найти счёт "Т-банк" с максимальным балансом или первый доступный счёт
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name, balance')
      .eq('user_id', userId)
      .order('balance', { ascending: false });
    
    // Фильтруем по имени "Т-банк" если есть
    const tBankAccounts = accounts?.filter(a => a.name?.toLowerCase().includes('т-банк')) || [];
    const selectedAccounts = tBankAccounts.length > 0 ? tBankAccounts : accounts;
    
    let accountId: string;
    
    if (!selectedAccounts || selectedAccounts.length === 0) {
      // Создать дефолтный счёт
      const { data: newAccount, error: accountError } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          name: 'Основной счёт',
          type: 'cash',
          currency: 'RUB',
          balance: 0,
        })
        .select('id')
        .single();
      
      if (accountError || !newAccount) {
        console.error('Failed to create account:', accountError);
        return NextResponse.json({ 
          error: 'Failed to create account',
          details: accountError?.message || 'Unknown error'
        }, { status: 500 });
      }
      
      accountId = newAccount.id;
    } else {
      accountId = selectedAccounts[0].id;
    }

    // Создать транзакции для каждого товара
    const transactions = [];
    for (const item of items) {
      // Конвертируем price в число (может быть строкой из n8n)
      const priceValue = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      const amountMinor = Math.round(priceValue * 100);
      
      const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          account_id: accountId,
          category_id: categoryId,
          direction: 'expense',
          amount: amountMinor,
          currency: 'RUB',
          occurred_at: date || new Date().toISOString(),
          note: `${shop_name} - ${item.name}`,
          counterparty: shop_name,
        })
        .select()
        .single();
      
      if (!txnError && txn) {
        transactions.push(txn);
      }
    }

    return NextResponse.json({
      success: true,
      transactions_created: transactions.length,
      category: mainCategory,
      shop: shop_name,
    });

  } catch (error) {
    console.error('Error processing receipt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
