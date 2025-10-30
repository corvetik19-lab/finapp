import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/helpers';

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenRouter API error');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Извлекаем JSON из ответа
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return null;
  } catch (error) {
    console.error('AI categorization error:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRSCClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Получить workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    const workspaceId = membership.workspace_id;

    // Получить дефолтный счёт
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .limit(1)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'No account found. Create an account first.' }, { status: 400 });
    }

    // Создать транзакции для каждого категоризированного товара
    const iconMap: Record<string, string> = {
      'Продукты': '🛒',
      'Транспорт': '🚗',
      'Развлечения': '🎮',
      'Здоровье': '💊',
      'Одежда': '👕',
      'Дом': '🏠',
      'Образование': '📚',
      'Кафе/Рестораны': '🍔',
      'Прочее': '📦',
    };

    const transactions = [];
    
    for (const item of categorizedItems) {
      // Найти или создать категорию для каждого товара
      const categoryName = item.category || mainCategory;
      
      let categoryId: string | null = null;
      
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .single();

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        // Создать новую категорию
        const { data: newCategory } = await supabase
          .from('categories')
          .insert({
            workspace_id: workspaceId,
            name: categoryName,
            type: 'expense',
            icon: iconMap[categoryName] || '📦',
          })
          .select('id')
          .single();
        
        if (newCategory) {
          categoryId = newCategory.id;
        }
      }

      transactions.push({
        workspace_id: workspaceId,
        account_id: account.id,
        category_id: categoryId,
        amount_minor: Math.round(item.price * 100), // в копейках
        currency: 'RUB',
        direction: 'expense',
        occurred_at: date || new Date().toISOString(),
        note: `${item.name} (${shop_name})`,
        counterparty: shop_name,
      });
    }

    const { data: createdTransactions, error } = await supabase
      .from('transactions')
      .insert(transactions)
      .select('id');

    if (error) {
      console.error('Transaction insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: createdTransactions?.length || 0,
      category: mainCategory,
      shop: shop_name,
      categorized_by_ai: !!categorized,
    });
  } catch (error) {
    console.error('Receipt import error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
