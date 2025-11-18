import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function recreateReceiptForTBank() {
  console.log('🔍 Ищем текущего пользователя и его счета...\n');
  
  // Получаем текущего пользователя (последнего авторизованного)
  const { data: { users } } = await supabase.auth.admin.listUsers();
  
  if (!users || users.length === 0) {
    console.error('❌ Пользователи не найдены');
    return;
  }
  
  const user = users[0];
  console.log(`✅ Пользователь: ${user.email}`);
  console.log(`   ID: ${user.id}\n`);
  
  // Получаем все счета пользователя
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type, balance, currency')
    .eq('user_id', user.id)
    .is('deleted_at', null);
  
  console.log(`📊 Счета пользователя (${accounts?.length || 0}):`);
  accounts?.forEach(acc => {
    console.log(`   - ${acc.name} (${acc.type}): ${acc.balance / 100} ${acc.currency}`);
  });
  
  // Ищем Т банк
  const tbank = accounts?.find(acc => acc.name.toLowerCase().includes('т банк') || acc.name.toLowerCase().includes('тинькофф'));
  
  if (!tbank) {
    console.error('\n❌ Счёт "Т банк" не найден!');
    console.log('   Доступные счета:', accounts?.map(a => a.name).join(', '));
    return;
  }
  
  console.log(`\n✅ Найден счёт: ${tbank.name}`);
  console.log(`   ID: ${tbank.id}`);
  console.log(`   Баланс: ${tbank.balance / 100} ${tbank.currency}\n`);
  
  // Получаем категорию "Продукты"
  const { data: category } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('kind', 'expense')
    .or('name.ilike.%продукты%,name.ilike.%питание%,name.ilike.%еда%')
    .limit(1)
    .single();
  
  console.log(`📂 Категория: ${category?.name || 'НЕТ'}\n`);
  
  // Удаляем старые тестовые транзакции
  console.log('🗑️  Удаляем старые тестовые транзакции...');
  const { data: oldTransactions } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('counterparty', 'ПРЕМИУМ');
  
  if (oldTransactions && oldTransactions.length > 0) {
    for (const tx of oldTransactions) {
      // Удаляем позиции
      await supabase
        .from('transaction_items')
        .delete()
        .eq('transaction_id', tx.id);
      
      // Удаляем транзакцию
      await supabase
        .from('transactions')
        .delete()
        .eq('id', tx.id);
    }
    console.log(`   Удалено: ${oldTransactions.length} транзакций\n`);
  }
  
  // Создаём новую транзакцию
  console.log('📝 Создаём новую транзакцию...');
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id: tbank.id,
      category_id: category?.id || null,
      direction: 'expense',
      amount: -Math.round(236.96 * 100),
      currency: 'RUB',
      occurred_at: '2025-11-07',
      note: 'Покупка в ПРЕМИУМ',
      counterparty: 'ПРЕМИУМ'
    })
    .select()
    .single();
  
  if (txError) {
    console.error('❌ Ошибка создания транзакции:', txError);
    return;
  }
  
  console.log(`✅ Транзакция создана: ${transaction.id}\n`);
  
  // Добавляем позиции товаров
  console.log('📦 Добавляем позиции товаров...');
  const items = [
    { name: 'Онигири', quantity: 2, pricePerUnit: 89.99, total: 179.98 },
    { name: 'Батончик', quantity: 1, pricePerUnit: 16.99, total: 16.99 },
    { name: 'Жевательная резинка', quantity: 1, pricePerUnit: 39.99, total: 39.99 }
  ];
  
  for (const item of items) {
    await supabase
      .from('transaction_items')
      .insert({
        user_id: user.id,
        transaction_id: transaction.id,
        name: item.name,
        quantity: item.quantity,
        unit: 'шт',
        price_per_unit: Math.round(item.pricePerUnit * 100),
        total_amount: Math.round(item.total * 100)
      });
    
    console.log(`   ✅ ${item.name}: ${item.quantity} шт × ${item.pricePerUnit} ₽`);
  }
  
  // Обновляем баланс счёта
  const newBalance = tbank.balance - Math.round(236.96 * 100);
  await supabase
    .from('accounts')
    .update({ balance: newBalance })
    .eq('id', tbank.id);
  
  console.log(`\n💳 Баланс счёта "${tbank.name}" обновлён:`);
  console.log(`   Было: ${tbank.balance / 100} ${tbank.currency}`);
  console.log(`   Стало: ${newBalance / 100} ${tbank.currency}`);
  
  console.log('\n✅ Готово! Откройте http://localhost:3000/finance/transactions');
}

recreateReceiptForTBank().catch(console.error);
