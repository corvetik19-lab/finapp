import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Загружаем переменные окружения из .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Отсутствуют переменные окружения:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestProducts() {
  console.log('🔍 Получаем user_id...');
  
  // Получаем первого пользователя
  const { data: users, error: usersError } = await supabase
    .from('auth.users')
    .select('id, email')
    .limit(1);
  
  if (usersError) {
    console.error('❌ Ошибка получения пользователей:', usersError);
    
    // Попробуем через auth API
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError || !authUsers || authUsers.length === 0) {
      console.error('❌ Не удалось получить пользователей:', authError);
      return;
    }
    
    const userId = authUsers[0].id;
    console.log('✅ User ID:', userId);
    console.log('📧 Email:', authUsers[0].email);
    
    await insertProducts(userId);
    return;
  }
  
  if (!users || users.length === 0) {
    console.error('❌ Пользователи не найдены');
    return;
  }
  
  const userId = users[0].id;
  console.log('✅ User ID:', userId);
  console.log('📧 Email:', users[0].email);
  
  await insertProducts(userId);
}

async function insertProducts(userId: string) {
  console.log('\n📦 Добавляем тестовые товары...');
  
  const products = [
    { name: 'Онигири', unit: 'шт', price: 9000, category: 'Еда' },
    { name: 'Батончик', unit: 'шт', price: 1700, category: 'Еда' },
    { name: 'Жевательная резинка', unit: 'шт', price: 4000, category: 'Еда' },
    { name: 'Кола', unit: 'л', price: 10000, category: 'Напитки' },
    { name: 'Молоко', unit: 'л', price: 8000, category: 'Напитки' },
    { name: 'Хлеб', unit: 'шт', price: 5000, category: 'Еда' },
    { name: 'Масло', unit: 'кг', price: 15000, category: 'Еда' },
    { name: 'Сыр', unit: 'кг', price: 60000, category: 'Еда' },
    { name: 'Яйца', unit: 'уп', price: 12000, category: 'Еда' },
    { name: 'Курица', unit: 'кг', price: 35000, category: 'Мясо' },
  ];
  
  for (const product of products) {
    const { data, error } = await supabase
      .from('product_items')
      .insert({
        user_id: userId,
        name: product.name,
        default_unit: product.unit,
        default_price_per_unit: product.price,
        category: product.category,
        is_active: true,
      })
      .select();
    
    if (error) {
      if (error.code === '23505') {
        console.log(`⚠️  ${product.name} уже существует`);
      } else {
        console.error(`❌ Ошибка добавления ${product.name}:`, error);
      }
    } else {
      console.log(`✅ Добавлен: ${product.name} (${product.price / 100} ₽)`);
    }
  }
  
  // Проверяем что товары добавлены
  console.log('\n📋 Проверка товаров в БД...');
  const { data: allProducts, count } = await supabase
    .from('product_items')
    .select('name, default_unit, default_price_per_unit, category, is_active', { count: 'exact' })
    .eq('user_id', userId)
    .order('name');
  
  console.log(`\n📊 Всего товаров: ${count}`);
  console.log('\n📦 Список товаров:');
  allProducts?.forEach(p => {
    const price = p.default_price_per_unit ? `${p.default_price_per_unit / 100} ₽` : 'не указана';
    const status = p.is_active ? '✅' : '❌';
    console.log(`${status} ${p.name} (${p.default_unit}) - ${price} - ${p.category}`);
  });
}

addTestProducts().catch(console.error);
