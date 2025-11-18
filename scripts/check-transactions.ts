import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTransactions() {
  const userId = '94bb6cd5-3b0b-48a2-b904-b070ba28a38b';
  
  console.log('🔍 Проверяем транзакции за ноябрь 2025...\n');
  
  // Получаем транзакции за ноябрь
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, occurred_at, amount, currency, direction, counterparty, note')
    .eq('user_id', userId)
    .gte('occurred_at', '2025-11-01')
    .lte('occurred_at', '2025-11-30')
    .order('occurred_at', { ascending: false });
  
  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }
  
  console.log(`📊 Найдено транзакций: ${transactions?.length || 0}\n`);
  
  transactions?.forEach((tx, idx) => {
    const date = new Date(tx.occurred_at).toLocaleDateString('ru-RU');
    const amount = (tx.amount / 100).toFixed(2);
    const sign = tx.direction === 'expense' ? '-' : '+';
    
    console.log(`${idx + 1}. ${date} | ${sign}${amount} ${tx.currency}`);
    console.log(`   ${tx.counterparty || 'Без контрагента'}`);
    console.log(`   ${tx.note || 'Без заметки'}`);
    console.log(`   ID: ${tx.id}\n`);
  });
  
  // Проверяем нашу транзакцию от чека
  const receiptTx = transactions?.find(tx => tx.counterparty === 'ПРЕМИУМ');
  
  if (receiptTx) {
    console.log('✅ Транзакция от чека найдена!');
    console.log(`   Дата: ${new Date(receiptTx.occurred_at).toLocaleDateString('ru-RU')}`);
    console.log(`   Сумма: ${(receiptTx.amount / 100).toFixed(2)} ${receiptTx.currency}`);
    
    // Проверяем позиции
    const { data: items } = await supabase
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', receiptTx.id);
    
    console.log(`\n   📦 Позиций товаров: ${items?.length || 0}`);
    items?.forEach(item => {
      console.log(`      - ${item.name}: ${item.quantity} ${item.unit} × ${(item.price_per_unit / 100).toFixed(2)} ₽`);
    });
  } else {
    console.log('❌ Транзакция от чека НЕ найдена в ноябре');
    console.log('   Возможно она была создана с другой датой');
  }
}

checkTransactions().catch(console.error);
