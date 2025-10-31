import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// OpenRouter API для AI категоризации
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function categorizeWithAI(items: any[], shopName: string) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
  
  const prompt = `Ты - эксперт по категоризации покупок. Распредели товары из чека по категориям.

Доступные категории:
- Продукты (еда, напитки)
- Транспорт (такси, бензин, парковка)
- Развлечения (кино, игры, подписки)
- Здоровье (аптека, врачи, спорт)
- Одежда (одежда, обувь)
- Дом (мебель, техника, ремонт)
- Образование (книги, курсы)
- Кафе/Рестораны (кафе, рестораны)
- Прочее

Магазин: ${shopName}
Товары:
${items.map((item) => `- ${item.name}: ${item.price}₽`).join('\n')}

Верни ТОЛЬКО JSON:
{
  "items": [{"name": "...", "price": 0, "category": "..."}],
  "main_category": "..."
}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
    
    return null;
  } catch (error) {
    console.error('AI categorization error:', error);
    return null;
  }
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
    const { shop_name, date, items } = body;

    // Валидация
    if (!shop_name || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // AI категоризация через OpenRouter
    const categorized = await categorizeWithAI(items, shop_name);
    const categorizedItems = categorized?.items || items;
    const mainCategory = categorized?.main_category || 'Прочее';

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
          type: 'expense',
          user_id: userId,
        })
        .select('id')
        .single();
      
      if (newCategory) {
        categoryId = newCategory.id;
      }
    }

    // Найти или создать счёт пользователя
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    
    let accountId: string;
    
    if (!accounts || accounts.length === 0) {
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
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
      }
      
      accountId = newAccount.id;
    } else {
      accountId = accounts[0].id;
    }

    // Создать транзакции для каждого товара
    const transactions = [];
    for (const item of categorizedItems) {
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
