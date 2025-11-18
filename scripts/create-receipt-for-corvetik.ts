import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createReceiptForCorvetik() {
  console.log('🔍 Ищем пользователя corvetik1@yandex.ru...\n');
  
  // Получаем пользователя
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users?.find(u => u.email === 'corvetik1@yandex.ru');
  
  if (!user) {
    console.error('❌ Пользователь corvetik1@yandex.ru не найден!');
    console.log('   Доступные пользователи:', users?.map(u => u.email).join(', '));
    return;
  }
  
  console.log(`✅ Пользователь найден: ${user.email}`);
  console.log(`   ID: ${user.id}\n`);
  
  // Получаем счета пользователя
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type, balance, currency')
    .eq('user_id', user.id)
    .is('deleted_at', null);
  
  console.log(`📊 Счета пользователя (${accounts?.length || 0}):`);
  accounts?.forEach(acc => {
    console.log(`   - ${acc.name} (${acc.type}): ${acc.balance / 100} ${acc.currency}`);
  });
  
  if (!accounts || accounts.length === 0) {
    console.error('\n❌ У пользователя нет счетов!');
    return;
  }
  
  // Берём первый счёт
  const account = accounts[0];
  console.log(`\n✅ Используем счёт: ${account.name}`);
  console.log(`   Баланс: ${account.balance / 100} ${account.currency}\n`);
  
  // Получаем или создаём категорию "Продукты"
  let { data: category } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('kind', 'expense')
    .or('name.ilike.%продукты%,name.ilike.%питание%,name.ilike.%еда%')
    .limit(1)
    .single();
  
  if (!category) {
    console.log('📂 Создаём категорию "Продукты"...');
    const { data: newCategory } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: 'Продукты',
        kind: 'expense',
        icon: '🛒'
      })
      .select()
      .single();
    category = newCategory;
  }
  
  console.log(`📂 Категория: ${category?.name}\n`);
  
  // Добавляем товары для пользователя
  console.log('📦 Добавляем товары...');
  const products = [
    { name: 'Онигири', unit: 'шт', price: 9000 },
    { name: 'Батончик', unit: 'шт', price: 1700 },
    { name: 'Жевательная резинка', unit: 'шт', price: 4000 }
  ];
  
  for (const product of products) {
    const { error } = await supabase
      .from('product_items')
      .insert({
        user_id: user.id,
        name: product.name,
        default_unit: product.unit,
        default_price_per_unit: product.price,
        category: 'Еда',
        is_active: true
      });
    
    if (error && error.code !== '23505') {
      console.error(`   ❌ Ошибка добавления ${product.name}:`, error);
    } else {
      console.log(`   ✅ ${product.name}`);
    }
  }
  
  // Создаём транзакцию
  console.log('\n📝 Создаём транзакцию...');
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id: account.id,
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
  const newBalance = account.balance - Math.round(236.96 * 100);
  await supabase
    .from('accounts')
    .update({ balance: newBalance })
    .eq('id', account.id);
  
  console.log(`\n💳 Баланс счёта "${account.name}" обновлён:`);
  console.log(`   Было: ${account.balance / 100} ${account.currency}`);
  console.log(`   Стало: ${newBalance / 100} ${account.currency}`);
  
  console.log('\n✅ Готово! Войдите как corvetik1@yandex.ru и откройте:');
  console.log('   http://localhost:3000/finance/transactions');
}

createReceiptForCorvetik().catch(console.error);
