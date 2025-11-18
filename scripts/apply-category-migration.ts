import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📄 Применяем миграцию: добавление category_id...\n');
  
  const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '20251109_add_category_to_items.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  try {
    // Применяем миграцию (используем service role key для прямого SQL)
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // Если RPC не существует, пробуем напрямую через REST API
      console.log('⚠️  RPC не доступен, применяем вручную...\n');
      
      // Разбиваем на отдельные команды
      const commands = migrationSQL.split('$$;').filter(cmd => cmd.trim());
      
      for (const cmd of commands) {
        if (cmd.trim()) {
          console.log(`Выполняем: ${cmd.substring(0, 50)}...`);
        }
      }
      
      console.log('\n⚠️  Миграцию нужно применить вручную через Supabase SQL Editor');
      console.log('   Откройте: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
      console.log(`   Скопируйте SQL из: ${migrationPath}`);
    } else {
      console.log('✅ Миграция применена успешно!');
    }
  } catch (err) {
    console.error('❌ Ошибка применения миграции:', err);
    console.log('\n💡 Примените миграцию вручную через Supabase Dashboard:');
    console.log(`   ${migrationPath}`);
  }
  
  // Проверяем что колонки добавлены
  console.log('\n🔍 Проверяем структуру таблиц...');
  
  const { data: productColumns } = await supabase
    .from('product_items')
    .select('*')
    .limit(1);
  
  const { data: itemColumns } = await supabase
    .from('transaction_items')
    .select('*')
    .limit(1);
  
  console.log('\nproduct_items колонки:', Object.keys(productColumns?.[0] || {}));
  console.log('transaction_items колонки:', Object.keys(itemColumns?.[0] || {}));
  
  const hasProductCategoryId = productColumns?.[0] && 'category_id' in productColumns[0];
  const hasItemCategoryId = itemColumns?.[0] && 'category_id' in itemColumns[0];
  
  if (hasProductCategoryId && hasItemCategoryId) {
    console.log('\n✅ Колонка category_id успешно добавлена в обе таблицы!');
  } else {
    console.log('\n⚠️  Колонка category_id не найдена. Примените миграцию вручную.');
  }
}

applyMigration().catch(console.error);
