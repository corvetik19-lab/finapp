import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTransaction() {
  const userId = '94bb6cd5-3b0b-48a2-b904-b070ba28a38b';
  const transactionId = 'a11cbb09-6f4c-49d9-8433-8e7d8a5147a7'; // Из предыдущего теста
  
  console.log('🔍 Проверяем транзакцию...\n');
  
  // Получаем транзакцию
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();
  
  if (txError) {
    console.error('❌ Ошибка получения транзакции:', txError);
    return;
  }
  
  console.log('✅ Транзакция найдена:');
  console.log(`   ID: ${transaction.id}`);
  console.log(`   Дата: ${transaction.occurred_at}`);
  console.log(`   Сумма: ${transaction.amount / 100} ₽`);
  console.log(`   Магазин: ${transaction.counterparty}`);
  console.log(`   Заметка: ${transaction.note}`);
  
  // Получаем позиции товаров
  const { data: items, error: itemsError } = await supabase
    .from('transaction_items')
    .select('*')
    .eq('transaction_id', transactionId);
  
  if (itemsError) {
    console.error('❌ Ошибка получения позиций:', itemsError);
    return;
  }
  
  console.log(`\n📦 Позиции товаров (${items?.length || 0}):`);
  items?.forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.name}`);
    console.log(`      Количество: ${item.quantity} ${item.unit}`);
    console.log(`      Цена за ед: ${item.price_per_unit / 100} ₽`);
    console.log(`      Сумма: ${item.total_amount / 100} ₽`);
  });
  
  // Проверяем баланс счёта
  const { data: account } = await supabase
    .from('accounts')
    .select('name, balance, currency')
    .eq('id', transaction.account_id)
    .single();
  
  if (account) {
    console.log(`\n💳 Счёт: ${account.name}`);
    console.log(`   Баланс: ${account.balance / 100} ${account.currency}`);
  }
  
  console.log('\n✅ Проверка завершена!');
}

verifyTransaction().catch(console.error);
