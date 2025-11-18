import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupReceiptScanner() {
  console.log('🚀 Настройка системы сканирования чеков...\n');
  
  // 1. Найти пользователя
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users?.find(u => u.email === 'corvetik1@yandex.ru');
  
  if (!user) {
    console.error('❌ Пользователь не найден');
    return;
  }
  
  console.log(`✅ Пользователь: ${user.email}`);
  console.log(`   ID: ${user.id}\n`);
  
  // 2. Создать/получить категории
  console.log('📂 Настройка категорий...');
  
  const categories = [
    { name: 'Продукты', icon: '🛒', kind: 'expense' },
    { name: 'Напитки', icon: '🥤', kind: 'expense' },
    { name: 'Еда вне дома', icon: '🍔', kind: 'expense' },
  ];
  
  const categoryMap: Record<string, string> = {};
  
  for (const cat of categories) {
    let { data: existing } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('name', cat.name)
      .single();
    
    if (!existing) {
      const { data: created } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          ...cat
        })
        .select()
        .single();
      existing = created;
      console.log(`   ✅ Создана: ${cat.name}`);
    } else {
      console.log(`   ℹ️  Существует: ${cat.name}`);
    }
    
    if (existing) {
      categoryMap[cat.name] = existing.id;
    }
  }
  
  // 3. Создать товары с категориями
  console.log('\n📦 Настройка товаров...');
  
  const products = [
    { name: 'Онигири', unit: 'шт', price: 9000, category: 'Продукты' },
    { name: 'Батончик', unit: 'шт', price: 1700, category: 'Продукты' },
    { name: 'Жевательная резинка', unit: 'шт', price: 4000, category: 'Продукты' },
    { name: 'Кола', unit: 'л', price: 10000, category: 'Напитки' },
    { name: 'Молоко', unit: 'л', price: 8000, category: 'Напитки' },
    { name: 'Хлеб', unit: 'шт', price: 5000, category: 'Продукты' },
    { name: 'Масло', unit: 'кг', price: 15000, category: 'Продукты' },
    { name: 'Сыр', unit: 'кг', price: 60000, category: 'Продукты' },
    { name: 'Яйца', unit: 'уп', price: 12000, category: 'Продукты' },
    { name: 'Курица', unit: 'кг', price: 35000, category: 'Продукты' },
  ];
  
  for (const product of products) {
    const categoryId = categoryMap[product.category];
    
    const { error } = await supabase
      .from('product_items')
      .insert({
        user_id: user.id,
        name: product.name,
        default_unit: product.unit,
        default_price_per_unit: product.price,
        category_id: categoryId,
        is_active: true
      });
    
    if (error && error.code !== '23505') {
      console.log(`   ❌ ${product.name}: ${error.message}`);
    } else {
      console.log(`   ✅ ${product.name} (${product.category})`);
    }
  }
  
  // 4. Проверка структуры БД
  console.log('\n🔍 Проверка структуры БД...');
  
  const { data: sampleProduct } = await supabase
    .from('product_items')
    .select('*')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  
  const hasCategoryId = sampleProduct && 'category_id' in sampleProduct;
  
  if (hasCategoryId) {
    console.log('   ✅ Колонка category_id существует');
  } else {
    console.log('   ⚠️  Колонка category_id НЕ найдена!');
    console.log('   💡 Примените миграцию: npx tsx scripts/apply-category-migration.ts');
  }
  
  // 5. Итоговая статистика
  console.log('\n📊 Итоговая статистика:');
  
  const { count: categoriesCount } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('kind', 'expense');
  
  const { count: productsCount } = await supabase
    .from('product_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true);
  
  console.log(`   Категорий расходов: ${categoriesCount}`);
  console.log(`   Активных товаров: ${productsCount}`);
  
  console.log('\n✅ Настройка завершена!');
  console.log('\n🎯 Следующие шаги:');
  console.log('   1. Перезапустите dev сервер: npm run dev');
  console.log('   2. Откройте: http://localhost:3000/finance/transactions');
  console.log('   3. Нажмите на кнопку "+" внизу справа');
  console.log('   4. Вставьте текст чека и отправьте');
  console.log('\n📖 Документация: docs/RECEIPT_SCANNER_GUIDE.md');
}

setupReceiptScanner().catch(console.error);
