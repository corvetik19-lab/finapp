import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// OpenRouter API для AI категоризации
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function categorizeWithAI(items: any[], shopName: string) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
  
  const prompt = `Ты - эксперт по категоризации финансовых транзакций. Проанализируй покупку и определи НАИБОЛЕЕ ПОДХОДЯЩУЮ категорию.

КОНТЕКСТ:
Магазин/Компания: ${shopName}
Товары/Услуги:
${items.map((item) => `- ${item.name}: ${item.price}₽`).join('\n')}

ПРАВИЛА КАТЕГОРИЗАЦИИ:
1. Анализируй название магазина и товара для точного определения
2. Создавай КОНКРЕТНЫЕ категории вместо общих
3. Примеры специфичных категорий:
   - "Зарядка электромобиля" (для зарядных станций)
   - "Автомойка" (для мойки авто)
   - "Парковка" (для парковок)
   - "Каршеринг" (для аренды авто)
   - "Такси" (для такси и Яндекс.Такси)
   - "Продукты" (супермаркеты, продукты)
   - "Кафе" (кафе, рестораны, фастфуд)
   - "Аптека" (лекарства, медтовары)
   - "Одежда" (одежда, обувь)
   - "Развлечения" (кино, игры)
   - "Подписки" (Netflix, Spotify и т.д.)
   - "Коммунальные услуги" (свет, вода, газ)

4. Если не подходит ни одна - создай НОВУЮ конкретную категорию
5. Используй "Прочее" ТОЛЬКО если категорию невозможно определить

ПРИМЕРЫ:
- "АЙТИ ЧАРДЖ" + "Услуга по зарядке электрической энергией" → "Зарядка электромобиля"
- "Яндекс.Такси" → "Такси"
- "Пятёрочка" + "Молоко" → "Продукты"
- "КиноМакс" → "Развлечения"

Верни ТОЛЬКО JSON (без markdown):
{
  "items": [{"name": "название", "price": сумма, "category": "конкретная категория"}],
  "main_category": "основная категория для всей транзакции"
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
