import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTransactionCategory() {
  const userId = '94bb6cd5-3b0b-48a2-b904-b070ba28a38b';
  const transactionId = 'a11cbb09-6f4c-49d9-8433-8e7d8a5147a7';
  
  console.log('🔍 Проверяем транзакцию...\n');
  
  // Получаем транзакцию
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, category_id, counterparty, note')
    .eq('id', transactionId)
    .single();
  
  console.log('📋 Текущая транзакция:');
  console.log(`   ID: ${transaction?.id}`);
  console.log(`   Категория: ${transaction?.category_id || 'НЕТ'}`);
  console.log(`   Магазин: ${transaction?.counterparty}`);
  
  // Получаем категорию "Питание" или "Еда"
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, kind')
    .eq('user_id', userId)
    .eq('kind', 'expense')
    .or('name.ilike.%питание%,name.ilike.%еда%,name.ilike.%продукты%');
  
  console.log(`\n📂 Найдено категорий: ${categories?.length || 0}`);
  categories?.forEach(cat => {
    console.log(`   - ${cat.name} (${cat.id})`);
  });
  
  if (categories && categories.length > 0) {
    const categoryId = categories[0].id;
    
    // Обновляем транзакцию
    const { error } = await supabase
      .from('transactions')
      .update({ category_id: categoryId })
      .eq('id', transactionId);
    
    if (error) {
      console.error('\n❌ Ошибка обновления:', error);
    } else {
      console.log(`\n✅ Категория "${categories[0].name}" добавлена к транзакции!`);
    }
  } else {
    console.log('\n⚠️  Категория "Питание" не найдена. Создаём...');
    
    // Создаём категорию
    const { data: newCategory, error: createError } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: 'Питание',
        kind: 'expense',
        icon: '🍔'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Ошибка создания категории:', createError);
    } else {
      console.log(`✅ Категория "Питание" создана!`);
      
      // Обновляем транзакцию
      await supabase
        .from('transactions')
        .update({ category_id: newCategory.id })
        .eq('id', transactionId);
      
      console.log('✅ Категория добавлена к транзакции!');
    }
  }
  
  console.log('\n✅ Готово! Теперь транзакция должна быть видна в разделе "Питание"');
}

fixTransactionCategory().catch(console.error);
